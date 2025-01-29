# agents/automate_submission_agent.py

import asyncio
import json
import base64
from playwright.async_api import async_playwright
import google.generativeai as genai
from flask_socketio import SocketIO

class AutomateSubmissionAgent:
    def __init__(self, socketio: SocketIO, session_id: str, input_data: str):
        self.socketio = socketio
        self.session_id = session_id
        self.input_data = input_data
        self.screenshot_buffer = []
        self.buffer_lock = asyncio.Lock()
        self.streaming_task = None

    def configure_genai(self):
        genai.configure(api_key="AIzaSyBa2Boeqwb-nTZ_6IZxesRbawOBasBQr1E")  # Securely load API key from environment
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

    async def emit_log(self, message):
        """Emits a log message to the session room."""
        self.socketio.emit('process-log', {'message': message}, room=self.session_id)

    async def take_screenshot(self, page, step_description):
        """Takes a screenshot and adds it to the buffer."""
        try:
            screenshot_bytes = await page.screenshot()
            screenshot_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')
            async with self.buffer_lock:
                self.screenshot_buffer.append({
                    'description': step_description,
                    'screenshot': screenshot_b64
                })
            await self.emit_log(f"Screenshot taken: {step_description}")
        except Exception as e:
            await self.emit_log(f"Failed to take screenshot: {str(e)}")

    async def stream_screenshots(self):
        """Streams screenshots from the buffer at ~20fps."""
        while not self.streaming_task.done():
            async with self.buffer_lock:
                if self.screenshot_buffer:
                    screenshot = self.screenshot_buffer.pop(0)
                    self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
            await asyncio.sleep(0.05)  # 20fps

    def gemini_client(self, prompt, file_paths=[]):
        """Generates content using Gemini LLM."""
        if file_paths:
            uploaded_files = [genai.upload_file(file) for file in file_paths]
            response = self.model.generate_content([prompt] + uploaded_files)
        else:
            response = self.model.generate_content(prompt)
        return response.text

    async def automate_submission(self):
        """Performs the automation task for form submission."""
        try:
            await self.emit_log('Starting automation process.')
            self.configure_genai()

            # Start streaming screenshots
            self.streaming_task = asyncio.create_task(self.stream_screenshots())

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context()
                page = await context.new_page()

                await self.emit_log('Launching browser...')
                await page.goto('https://fluentforms.com/forms/contact-form-demo/')
                await self.emit_log('Navigated to form website.')
                await self.take_screenshot(page, 'Navigated to form website.')

                # Analyze the page to find input fields using Gemini LLM
                await self.emit_log('Analyzing form fields with Gemini LLM...')
                page_content = await page.content()

                prompt = (
                    "You are provided with the HTML content of a web form and user input data in arbitrary format. "
                    "Your task is to analyze the user input and map it to the form fields present in the HTML content. "
                    "Identify each form field's label, name, type, and CSS selector. Determine the appropriate value to fill "
                    "into each field based on the user input. If any required data is missing from the user input, "
                    "generate temporary placeholder data to ensure the form can be submitted successfully.\n\n"
                    "Additionally, identify multiple strategies to detect successful form submission dynamically. "
                    "These strategies may include, but are not limited to, detecting success messages, URL changes, "
                    "absence of the form, or any other reliable indicators.\n\n"
                    "Provide the output in the following JSON format:\n"
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
                    "Ensure the JSON output is properly structured and parsable.\n\n"
                    f"User Input Data:\n{self.input_data}\n\n"
                    f"HTML Content:\n{page_content}"
                )

                lml_response = self.gemini_client(prompt)
                try:
                    form_data = json.loads(lml_response)
                    form_fields = form_data.get("fields", [])
                    submit_button = form_data.get("submit_button", {})
                    confirmation_strategies = form_data.get("confirmation_strategies", [])
                    await self.emit_log('Successfully extracted form fields, submit button, and confirmation strategies.')

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

                    if field_type in ['text', 'email', 'password', 'textarea']:
                        await page.fill(selector, value)
                    elif field_type in ['radio', 'checkbox']:
                        if isinstance(value, str):
                            if value.lower() in ['true', 'yes', '1']:
                                await page.check(selector)
                        elif isinstance(value, bool) and value:
                            await page.check(selector)
                    elif field_type == 'select':
                        await page.select_option(selector, value)
                    # Add more field types as necessary

                    await self.take_screenshot(page, f"Filled '{field_name}' field with value '{value}'.")

                await self.emit_log('Form fields filled.')
                await self.take_screenshot(page, 'Form fields filled.')

                # Submit the form
                await self.emit_log('Submitting the form...')
                submit_selector = submit_button.get("selector", "button[type='submit']")
                await page.click(submit_selector)
                await self.take_screenshot(page, 'Clicked submit button.')

                # Implement dynamic confirmation detection
                await self.emit_log('Waiting for confirmation using dynamic strategies...')
                confirmation_detected = False
                for strategy in confirmation_strategies:
                    strat_name = strategy.get("strategy")
                    description = strategy.get("description")
                    await self.emit_log(f"Attempting confirmation strategy: {strat_name} - {description}")

                    if strat_name == "success_message":
                        success_selectors = ["div.success", "p.success", ".alert-success", ".message.success"]
                        success_texts = ["Thank you", "successfully submitted", "we have received your", "your form has been submitted"]
                        for sel in success_selectors:
                            try:
                                if await page.query_selector(sel):
                                    text_content = await page.inner_text(sel)
                                    if any(text.lower() in text_content.lower() for text in success_texts):
                                        await self.emit_log(f"Success message detected using selector '{sel}'.")
                                        confirmation_detected = True
                                        break
                            except:
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
                                break
                        except:
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
            # Stop the streaming task
            if self.streaming_task:
                self.streaming_task.cancel()
            # Optionally, send all buffered screenshots as a video
            await self.send_complete_video()

    async def send_complete_video(self):
        """Sends all buffered screenshots as a video after completion."""
        async with self.buffer_lock:
            for screenshot in self.screenshot_buffer:
                self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
            self.screenshot_buffer.clear()
