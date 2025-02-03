# agents.py
import asyncio
import json
import base64
from playwright.async_api import async_playwright, Page
import google.generativeai as genai
from flask_socketio import SocketIO
from typing import Dict, Any, List
import random
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

class AutomateSubmissionAgent:
    def __init__(self, socketio: SocketIO, session_id: str, input_data: str, formURL: str):
        self.socketio = socketio
        self.session_id = session_id
        self.input_data = input_data
        self.form_url = formURL
        self.screenshot_buffer: List[Dict[str, str]] = []
        self.buffer_lock = asyncio.Lock()
        self.streaming_task: asyncio.Task = None
        self.user_input_future: asyncio.Future = None

    def configure_genai(self):
        genai.configure(api_key="AIzaSyBa2Boeqwb-nTZ_6IZxesRbawOBasBQr1E")  # Replace with your actual API key
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-flash-latest",
            generation_config={
                "temperature": 0.2,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 8192,
                "response_mime_type": "application/json",
            }
        )
        
    async def generate_pdf(self, filled_form_data):
        """Generates a PDF with filled form responses."""
        pdf_filename = f"form_submission_{self.session_id}.pdf"
        c = canvas.Canvas(pdf_filename, pagesize=letter)
        c.setFont("Helvetica", 12)
        
        y = 750  # Start position
        c.drawString(50, y, "Form Submission Details")
        y -= 20
        c.line(50, y, 550, y)
        y -= 30

        for key, value in filled_form_data.items():
            c.drawString(50, y, f"{key}: {value}")
            y -= 20

        c.save()
        return pdf_filename

    async def emit_log(self, message: str):
        """Emits a log message to the session room."""
        self.socketio.emit('process-log', {'message': message}, room=self.session_id)

    async def take_screenshot(self, page: Page, step_description: str):
        """Takes a screenshot and adds it to the buffer."""
        try:
            screenshot_bytes = await page.screenshot()
            screenshot_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')
            async with self.buffer_lock:
                self.screenshot_buffer.append({
                    'description': step_description,
                    'screenshot': screenshot_b64
                })
        except Exception as e:
            await self.emit_log(f"Failed to take screenshot: {str(e)}")

    async def stream_screenshots(self):
        """Streams screenshots from the buffer at ~30fps."""
        try:
            while True:
                async with self.buffer_lock:
                    if self.screenshot_buffer:
                        screenshot = self.screenshot_buffer.pop(0)
                        self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
                await asyncio.sleep(1/10)  # ~10fps (adjust as needed)
        except asyncio.CancelledError:
            # Send any remaining screenshots
            async with self.buffer_lock:
                for screenshot in self.screenshot_buffer:
                    self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
                self.screenshot_buffer.clear()
            raise

    async def take_periodic_screenshots(self, page: Page):
        """Takes screenshots every second while the page is active."""
        try:
            while True:
                await self.take_screenshot(page, "Continuous capture")
                await asyncio.sleep(1)  # Capture every second
        except asyncio.CancelledError:
            pass
        except Exception as e:
            await self.emit_log(f"Periodic screenshot error: {str(e)}")

    def gemini_client(self, prompt: str, file_paths: List[str] = []) -> str:
        """Generates content using Gemini LLM."""
        if file_paths:
            uploaded_files = [genai.upload_file(file) for file in file_paths]
            response = self.model.generate_content([prompt] + uploaded_files)
        else:
            response = self.model.generate_content(prompt)
        return response.text

    async def prompt_user_for_input(self, prompt: str) -> Any:
        """Prompts the user for input and waits for the response."""
        self.user_input_future = asyncio.get_event_loop().create_future()
        self.socketio.emit('request-user-input', {'prompt': prompt}, room=self.session_id)
        await self.emit_log("Awaiting user input...")
        user_input = await self.user_input_future
        return user_input

    def handle_user_input(self, data: Any):
        """Handles the user input received from the frontend."""
        if self.user_input_future and not self.user_input_future.done():
            self.user_input_future.set_result(data)

    async def automate_submission(self):
        """Performs the automation task for form submission."""
        try:
            await self.emit_log('Starting automation process.')
            self.configure_genai()

            # Start streaming screenshots
            self.streaming_task = asyncio.create_task(self.stream_screenshots())

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)  # Set headless=False to see the browser actions
                context = await browser.new_context()
                page = await context.new_page()
                
                self.periodic_screenshot_task = asyncio.create_task(
                    self.take_periodic_screenshots(page)
                )

                await self.emit_log('Launching browser...')
                await self.take_screenshot(page, 'Launching browser.')
                await asyncio.sleep(1)  # Delay for visibility

                await page.goto(self.form_url)
                
                # Now that the form is loaded, start filling it.
                await self.emit_log('Starting to fill out the form...')
                await self.take_screenshot(page, 'Form page loaded.')
                await asyncio.sleep(1)

                # Analyze the form fields using Gemini LLM
                await self.emit_log('Analyzing form fields with Gemini LLM...')
                page_content = await page.content()

                # Note: The prompt now instructs Gemini to account for ALL input types and to only fill startup-related data.
                prompt = (
                    "You are provided with the HTML content of a web form and user input data in arbitrary format. "
                    "Your task is to analyze the HTML and map the startup-related user input data to the form fields. "
                    "Analyze each input field’s label, name, type, and CSS selector. "
                    "The form may include any of the following input types: button, checkbox, color, date, datetime-local, email, file, hidden, image, month, number, password, radio, range, reset, search, submit, text, time, url, week, and any textarea or select fields. "
                    "For each field, determine the correct value that should be filled based on the provided startup data. "
                    "If any required data is missing from the user input, generate a temporary valid startup placeholder value to allow the form to be submitted successfully. "
                    "Do not enter any dump values or placeholders that are not related to startups. "
                    "Also, determine a CSS selector for the submit button and suggest one or more dynamic confirmation strategies "
                    "(for example, detecting a success message, a URL change, or the absence of the form).\n\n"
                    "Return the output strictly in the following JSON format:\n"
                    "```json\n"
                    "{\n"
                    "  \"fields\": [\n"
                    "    {\n"
                    "      \"label\": \"Full Name\",\n"
                    "      \"name\": \"name\",\n"
                    "      \"type\": \"text\",\n"
                    "      \"selector\": \"#name\",\n"
                    "      \"value\": \"John Doe\"\n"
                    "    },\n"
                    "    {\n"
                    "      \"label\": \"Email Address\",\n"
                    "      \"name\": \"email\",\n"
                    "      \"type\": \"email\",\n"
                    "      \"selector\": \"#email\",\n"
                    "      \"value\": \"johndoe@example.com\"\n"
                    "    }\n"
                    "    // Add more fields as necessary\n"
                    "  ],\n"
                    "  \"submit_button\": {\n"
                    "    \"text\": \"Submit\",\n"
                    "    \"selector\": \"button[type='submit']\"\n"
                    "  },\n"
                    "  \"confirmation_strategies\": [\n"
                    "    {\n"
                    "      \"strategy\": \"success_message\",\n"
                    "      \"description\": \"Detect a success message with specific text or CSS selector.\"\n"
                    "    },\n"
                    "    {\n"
                    "      \"strategy\": \"url_change\",\n"
                    "      \"description\": \"Monitor for a change in the URL indicating a new page or a confirmation URL.\"\n"
                    "    }\n"
                    "    // Add more strategies as necessary\n"
                    "  ]\n"
                    "}\n"
                    "```\n\n"
                    f"User Input Data:\n {self.input_data} \n\n"
                    f"HTML Content:\n{page_content}"
                )

                lml_response = self.gemini_client(prompt)
                await self.emit_log('Received response from Gemini LLM.')
                try:
                    form_data = json.loads(lml_response)
                    
                    print("\nform data: ", form_data)
                    form_fields = form_data.get("fields", [])
                    submit_button = form_data.get("submit_button", {})
                    confirmation_strategies = form_data.get("confirmation_strategies", [])
                    await self.emit_log('Successfully extracted form fields, submit button, and confirmation strategies.')
                    await self.take_screenshot(page, 'Extracted form details.')

                    # Emit suggested fields to the frontend
                    self.socketio.emit('suggested-fields', {
                        'fields': form_fields,
                        'confirmation_strategies': confirmation_strategies
                    }, room=self.session_id)
                except json.JSONDecodeError:
                    await self.emit_log('Failed to parse Gemini LLM response.')
                    return

                # Fill out the form based on extracted fields
                await self.emit_log('Filling out the form fields...')
                for field in form_fields:
                    field_name = field.get('name')
                    selector = field.get('selector')
                    field_type = field.get('type')
                    value = field.get('value', '')

                    # If no value was provided, prompt the user.
                    if not value:
                        prompt_msg = f"Please provide a value for the field '{field_name}' ({field.get('label')})."
                        user_value = await self.prompt_user_for_input(prompt_msg)
                        value = user_value.get('value', '')
                        # Special handling for file uploads
                        if field_type == 'file':
                            self.socketio.emit('request-file-upload', {
                                'prompt': f"Please upload a file for the field '{field_name}' ({field.get('label')})."
                            }, room=self.session_id)
                            file_upload = await self.prompt_user_for_input("file_upload")
                            file_b64 = file_upload.get('file', '')
                            file_path = f"temp_{self.session_id}_{field_name}.png"  # Adjust extension as needed
                            with open(file_path, "wb") as f:
                                f.write(base64.b64decode(file_b64))
                            value = file_path

                    # Use smooth scrolling and type-with-effect functions where appropriate.
                    if field_type in ['text', 'email', 'password', 'textarea']:
                        await self._smooth_scroll_to_element(page, selector)
                        await self._type_with_effect(page, selector, value)
                    elif field_type in ['date', 'datetime-local', 'time', 'month', 'week']:
                        await self._smooth_scroll_to_element(page, selector)
                        await page.fill(selector, value)
                    elif field_type == 'number':
                        await self._smooth_scroll_to_element(page, selector)
                        await page.fill(selector, str(value))
                    elif field_type == 'range':
                        await self._smooth_scroll_to_element(page, selector)
                        # Set the value via JavaScript and trigger an input event
                        await page.evaluate(
                            """(selector, value) => {
                                   const input = document.querySelector(selector);
                                   if(input) {
                                       input.value = value;
                                       input.dispatchEvent(new Event('input'));
                                   }
                               }""",
                            selector,
                            value
                        )
                    elif field_type in ['color', 'tel', 'url', 'search']:
                        await self._smooth_scroll_to_element(page, selector)
                        await page.fill(selector, value)
                    elif field_type == 'select':
                        await self._smooth_scroll_to_element(page, selector)
                        await page.select_option(selector, value)
                    elif field_type in ['checkbox', 'radio']:
                        await self._smooth_scroll_to_element(page, selector)
                        # For checkboxes/radios, if the value indicates truthiness (or matches a known positive string), check it.
                        if isinstance(value, bool):
                            if value:
                                await page.check(selector)
                        elif isinstance(value, str):
                            if value.lower() in ['true', 'yes', '1', 'done']:
                                await page.check(selector)
                            else:
                                # If the value indicates that this option should not be selected, skip checking.
                                await self.emit_log(f"Skipping checkbox/radio '{field_name}' as value '{value}' did not indicate selection.")
                    elif field_type == 'file':
                        await self._smooth_scroll_to_element(page, selector)
                        await page.set_input_files(selector, value)  # value should be a file path
                    elif field_type == 'hidden':
                        # For hidden fields, set the value using JavaScript if needed.
                        await page.evaluate(
                            """(selector, value) => {
                                   const input = document.querySelector(selector);
                                   if(input) { input.value = value; }
                               }""",
                            selector,
                            value
                        )
                    elif field_type in ['button', 'reset', 'submit', 'image']:
                        await self.emit_log(f"Skipping field type '{field_type}' for field '{field_name}'.")
                    else:
                        # Fallback: attempt to fill using type-with-effect
                        await self._smooth_scroll_to_element(page, selector)
                        await self._type_with_effect(page, selector, value)

                    await self.take_screenshot(page, f"Filled field '{field_name}' with value '{value}'.")
                    await asyncio.sleep(0.5)  # Delay for visual effect

                await self.emit_log('Form fields filled.')
                await self.take_screenshot(page, 'Form fields filled.')
                await asyncio.sleep(1)

                # Emit filled form responses to frontend before submission.
                filled_form_data = {field["label"]: field["value"] for field in form_fields}
                self.socketio.emit("confirm-form-submission", {
                    "message": "Shall I submit the form with the following details?",
                    "responses": filled_form_data
                }, room=self.session_id)

                # Wait for user confirmation.
                user_confirmation = await self.prompt_user_for_input("confirm_submission")
                if user_confirmation.get("value", "").lower() != "yes":
                    await self.emit_log("Submission canceled by user.")
                    return

                await self.emit_log('Submitting the form...')
                submit_selector = submit_button.get("selector", "button[type='submit']")
                await page.click(submit_selector)
                await self.take_screenshot(page, 'Clicked submit button.')
                await asyncio.sleep(2)
                
                # Generate PDF after submission.
                pdf_file = await self.generate_pdf(filled_form_data)
                with open(pdf_file, "rb") as f:
                    encoded_pdf = base64.b64encode(f.read()).decode('utf-8')
                self.socketio.emit("download-pdf", {"pdf_data": encoded_pdf, "filename": pdf_file}, room=self.session_id)
                await self.emit_log("PDF generated and sent to frontend.")

                # Implement dynamic confirmation detection.
                await self.emit_log('Waiting for confirmation using dynamic strategies...')
                confirmation_detected = False
                for strategy in confirmation_strategies:
                    strat_name = strategy.get("strategy")
                    description = strategy.get("description")
                    await self.emit_log(f"Attempting confirmation strategy: {strat_name} - {description}")
                    await self.take_screenshot(page, f"Attempting confirmation strategy: {strat_name}")

                    if strat_name == "success_message":
                        success_selectors = ["div.success", "p.success", ".alert-success", ".message.success"]
                        success_texts = ["thank you", "successfully submitted", "we have received your", "your form has been submitted"]
                        for sel in success_selectors:
                            try:
                                element = await page.query_selector(sel)
                                if element:
                                    text_content = await element.inner_text()
                                    if any(txt in text_content.lower() for txt in success_texts):
                                        await self.emit_log(f"Success message detected using selector '{sel}'.")
                                        confirmation_detected = True
                                        await self.take_screenshot(page, f"Success message detected using selector '{sel}'.")
                                        break
                            except Exception:
                                continue
                        if confirmation_detected:
                            break

                    elif strat_name == "url_change":
                        original_url = page.url
                        try:
                            await page.wait_for_timeout(5000)  # Wait for potential URL change
                            new_url = page.url
                            if new_url != original_url:
                                await self.emit_log(f"URL changed from {original_url} to {new_url}.")
                                confirmation_detected = True
                                await self.take_screenshot(page, f"URL changed from {original_url} to {new_url}.")
                                break
                        except Exception:
                            continue

                    elif strat_name == "form_absence":
                        form_selectors = ["form", "div.form-container", "#contact-form"]
                        form_absent = True
                        for form_sel in form_selectors:
                            if await page.query_selector(form_sel):
                                form_absent = False
                                break
                        if form_absent:
                            await self.emit_log("Form is no longer present on the page.")
                            confirmation_detected = True
                            await self.take_screenshot(page, "Form is no longer present on the page.")
                            break

                    else:
                        await self.emit_log(f"Unknown confirmation strategy: {strat_name}")

                if confirmation_detected:
                    await self.emit_log('Form submitted successfully!')
                    await self.take_screenshot(page, 'Form submitted successfully.')
                else:
                    await self.emit_log('Confirmation not detected. Verify submission.')
                    await self.take_screenshot(page, 'Confirmation not detected.')

        except Exception as e:
            await self.emit_log(f"Error occurred: {str(e)}")
        finally:
            if 'browser' in locals():
                await browser.close()
            await self.emit_log('Automation process completed.')
            if self.streaming_task:
                self.streaming_task.cancel()
            if self.periodic_screenshot_task:
                self.periodic_screenshot_task.cancel()
                try:
                    await self.periodic_screenshot_task
                except asyncio.CancelledError:
                    pass
            await self.send_complete_video()

    async def _smooth_scroll_to_element(self, page: Page, selector: str):
        """Smoothly scrolls to the specified element."""
        try:
            await page.evaluate(
                """async (selector) => {
                       const element = document.querySelector(selector);
                       if (element) {
                           element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                           await new Promise(resolve => setTimeout(resolve, 500));
                       }
                   }""",
                selector
            )
            await asyncio.sleep(0.3)
        except Exception as e:
            await self.emit_log(f"Error during scrolling: {str(e)}")

    async def _type_with_effect(self, page: Page, selector: str, text: str):
        """Simulates human-like typing with random delays."""
        try:
            await page.click(selector)  # Focus the field
            await page.evaluate(
                f"""() => {{
                        const element = document.querySelector('{selector}');
                        if (element) element.value = '';
                   }}"""
            )  # Clear field using JavaScript
            for char in text:
                await page.keyboard.type(char, delay=50)
                if len(text) > 3:
                    await self.take_screenshot(page, "Typing in progress")
        except Exception as e:
            await self.emit_log(f"Error during typing: {str(e)}")
            await page.fill(selector, text)

    async def send_complete_video(self):
        """Sends all buffered screenshots as a video after completion."""
        async with self.buffer_lock:
            for screenshot in self.screenshot_buffer:
                self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
            self.screenshot_buffer.clear()

    def receive_user_input(self, data: Any):
        """Receives user input from the frontend and sets the future result."""
        self.handle_user_input(data)
