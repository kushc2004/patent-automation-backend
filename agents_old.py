# agents.py
import asyncio
import json
import base64
from playwright.async_api import async_playwright, Page
import google.generativeai as genai
from flask_socketio import SocketIO
from typing import Dict, Any, List
import random

class AutomateSubmissionAgent:
    def __init__(self, socketio: SocketIO, session_id: str, input_data: Dict[str, Any], form_requirements: str):
        self.socketio = socketio
        self.session_id = session_id
        self.input_data = input_data
        self.form_requirements = form_requirements
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
            await self.emit_log(f"Screenshot taken: {step_description}")
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
                await asyncio.sleep(1)  # 30fps
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

                # Step 1: Open Google and search for forms
                await self.emit_log('Navigating to Google...')
                search_query = self.form_requirements
                await page.goto(f'https://www.google.com/search?q={search_query}&sourceid=chrome&ie=UTF-8')
                await self.take_screenshot(page, 'Navigated to Google.')
                await asyncio.sleep(1)  # Delay for visibility

                # Enter search query
                # search_query = self.form_requirements
                # await self.emit_log(f'Searching for forms: {search_query}')
                # await page.fill('input[name="q"]', search_query)
                # await page.keyboard.press('Enter')
                # await asyncio.sleep(2)  # Delay for search results to load
                # await self.take_screenshot(page, f'Searching for forms: {search_query}')
                # await asyncio.sleep(1)

                # # Click on the first search result
                # first_result_selector = 'h3'
                # await self.emit_log('Opening the first search result...')
                # first_result = await page.query_selector(first_result_selector)
                # if first_result:
                #     await first_result.click()
                #     await asyncio.sleep(3)  # Delay to allow the page to load
                #     await self.take_screenshot(page, 'Opened the first search result.')
                # else:
                #     await self.emit_log('No search results found.')
                #     return

                
                await page.goto('https://fluentforms.com/forms/contact-form-demo/')
                
                # Now, the first link should be opened. Start filling the form.
                await self.emit_log('Starting to fill out the form...')
                await self.take_screenshot(page, 'Form page loaded.')
                await asyncio.sleep(1)

                # Analyze the form fields using Gemini LLM
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
                    f"User Input Data:\n{json.dumps(self.input_data)}\n\n"
                    f"HTML Content:\n{page_content}"
                )

                lml_response = self.gemini_client(prompt)
                await self.emit_log('Received response from Gemini LLM.')
                try:
                    form_data = json.loads(lml_response)
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

                    if not value:
                        # Prompt user for missing data
                        prompt_msg = f"Please provide a value for the field '{field_name}' ({field.get('label')})."
                        user_value = await self.prompt_user_for_input(prompt_msg)
                        value = user_value.get('value', '')  # Assuming the frontend sends {'value': 'user input'}

                        # If the field requires a file upload
                        if field_type == 'file':
                            self.socketio.emit('request-file-upload', {
                                'prompt': f"Please upload a file for the field '{field_name}' ({field.get('label')})."
                            }, room=self.session_id)
                            file_upload = await self.prompt_user_for_input("file_upload")
                            # Assuming the frontend sends {'file': 'base64-encoded-file'}
                            file_b64 = file_upload.get('file', '')
                            # Save the file temporarily
                            file_path = f"temp_{self.session_id}_{field_name}.png"  # Adjust extension as needed
                            with open(file_path, "wb") as f:
                                f.write(base64.b64decode(file_b64))
                            value = file_path  # Path to the file

                    if field_type in ['text', 'email', 'password', 'textarea']:
                        
                        #await page.fill(selector, value)
                        await self._smooth_scroll_to_element(page, selector)
                        await self._type_with_effect(page, selector, value)
                    elif field_type in ['radio', 'checkbox']:
                        await self._smooth_scroll_to_element(page, selector)
                        if isinstance(value, str):
                            if value.lower() in ['true', 'yes', '1']:
                                await page.check(selector)
                        elif isinstance(value, bool) and value:
                            await page.check(selector)
                    elif field_type == 'select':
                        await self._smooth_scroll_to_element(page, selector)
                        await page.select_option(selector, value)
                    elif field_type == 'file':
                        await self._smooth_scroll_to_element(page, selector)
                        await page.set_input_files(selector, value)  # 'value' should be the file path
                    # Add more field types as necessary

                    await self.take_screenshot(page, f"Filled '{field_name}' field with value '{value}'.")
                    await asyncio.sleep(0.5)  # Delay for visibility

                await self.emit_log('Form fields filled.')
                await self.take_screenshot(page, 'Form fields filled.')
                await asyncio.sleep(1)

                # Submit the form
                await self.emit_log('Submitting the form...')
                submit_selector = submit_button.get("selector", "button[type='submit']")
                await page.click(submit_selector)
                await self.take_screenshot(page, 'Clicked submit button.')
                await asyncio.sleep(2)

                # Implement dynamic confirmation detection
                await self.emit_log('Waiting for confirmation using dynamic strategies...')
                confirmation_detected = False
                for strategy in confirmation_strategies:
                    strat_name = strategy.get("strategy")
                    description = strategy.get("description")
                    await self.emit_log(f"Attempting confirmation strategy: {strat_name} - {description}")
                    await self.take_screenshot(page, f"Attempting confirmation strategy: {strat_name}")

                    if strat_name == "success_message":
                        success_selectors = ["div.success", "p.success", ".alert-success", ".message.success"]
                        success_texts = ["Thank you", "successfully submitted", "we have received your", "your form has been submitted"]
                        for sel in success_selectors:
                            try:
                                element = await page.query_selector(sel)
                                if element:
                                    text_content = await element.inner_text()
                                    if any(text.lower() in text_content.lower() for text in success_texts):
                                        await self.emit_log(f"Success message detected using selector '{sel}'.")
                                        confirmation_detected = True
                                        await self.take_screenshot(page, f"Success message detected using selector '{sel}'.")
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
                                await self.take_screenshot(page, f"URL changed from {original_url} to {new_url}.")
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
            # Stop the streaming task
            if self.streaming_task:
                self.streaming_task.cancel()
            if self.periodic_screenshot_task:
                self.periodic_screenshot_task.cancel()
                try:
                    await self.periodic_screenshot_task
                except asyncio.CancelledError:
                    pass
            # Optionally, send all buffered screenshots as a video
            await self.send_complete_video()
            
    async def _smooth_scroll_to_element(self, page: Page, selector: str):
        """Smoothly scrolls to the specified element."""
        try:
            await page.evaluate(f"""async (selector) => {{
                const element = document.querySelector(selector);
                if (element) {{
                    element.scrollIntoView({{
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'center'
                    }});
                    // Add smooth transition for better visual effect
                    await new Promise(resolve => setTimeout(resolve, 500));
                }}
            }}""", selector)
            await asyncio.sleep(0.3)  # Allow time for scrolling animation
        except Exception as e:
            await self.emit_log(f"Error during scrolling: {str(e)}")

    async def _type_with_effect(self, page: Page, selector: str, text: str):
        """Simulates human-like typing with random delays."""
        try:
            await page.click(selector)  # Focus the field
            await page.evaluate(f"""() => {{
                const element = document.querySelector('{selector}');
                if (element) element.value = '';
            }}""")  # Clear field using JavaScript
            
            # Type character by character with random delays
            for char in text:
                await page.keyboard.type(char, delay=random.uniform(50, 150))
                # Take screenshot every 3 characters for typing effect
                if len(text) > 3 and random.random() < 0.3:
                    await self.take_screenshot(page, "Typing in progress")
        except Exception as e:
            await self.emit_log(f"Error during typing: {str(e)}")
            await page.fill(selector, text)  # Fallback to normal fill

    async def send_complete_video(self):
        """Sends all buffered screenshots as a video after completion."""
        async with self.buffer_lock:
            for screenshot in self.screenshot_buffer:
                self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
            self.screenshot_buffer.clear()

    def receive_user_input(self, data: Any):
        """Receives user input from the frontend and sets the future result."""
        self.handle_user_input(data)
