# agents.py
import eventlet
eventlet.monkey_patch()

import json
import base64
from playwright.sync_api import sync_playwright, Page
import google.generativeai as genai
from flask_socketio import SocketIO
from typing import Dict, Any, List
import threading

class AutomateSubmissionAgent:
    def __init__(self, socketio: SocketIO, session_id: str, input_data: Dict[str, Any], form_requirements: str):
        self.socketio = socketio
        self.session_id = session_id
        self.input_data = input_data
        self.form_requirements = form_requirements
        self.streaming = False
        self.page = None
        self.browser = None
        self.playwright = None
        self.lock = threading.Lock()
        self.screenshot_thread = None
        self.user_input_event = eventlet.event.Event()
        self.user_input = None

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

    def emit_log(self, message: str):
        """Emits a log message to the session room."""
        self.socketio.emit('process-log', {'message': message}, room=self.session_id)

    def take_screenshot(self, step_description: str):
        """Takes a screenshot and emits it."""
        try:
            if self.page:
                screenshot_bytes = self.page.screenshot()
                screenshot_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                self.socketio.emit('process-screenshot', {
                    'description': step_description,
                    'screenshot': screenshot_b64
                }, room=self.session_id)
                self.emit_log(f"Screenshot taken: {step_description}")
        except Exception as e:
            self.emit_log(f"Failed to take screenshot: {str(e)}")

    def screenshot_loop(self):
        """Continuously takes screenshots at 30fps."""
        while self.streaming:
            if self.page:
                try:
                    screenshot_bytes = self.page.screenshot()
                    screenshot_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                    self.socketio.emit('process-screenshot', {
                        'description': 'Continuous Screenshot',
                        'screenshot': screenshot_b64
                    }, room=self.session_id)
                except Exception as e:
                    self.emit_log(f"Failed to take continuous screenshot: {str(e)}")
            eventlet.sleep(1/30)  # Use eventlet's sleep to avoid blocking

    def gemini_client(self, prompt: str, file_paths: List[str] = []) -> str:
        """Generates content using Gemini LLM."""
        if file_paths:
            uploaded_files = [genai.upload_file(file) for file in file_paths]
            response = self.model.generate_content([prompt] + uploaded_files)
        else:
            response = self.model.generate_content(prompt)
        return response.text

    def prompt_user_for_input(self, prompt: str) -> Any:
        """Prompts the user for input and waits for the response."""
        self.socketio.emit('request-user-input', {'prompt': prompt}, room=self.session_id)
        self.emit_log("Awaiting user input...")
        # Wait for the user input event to be set by the socket handler
        self.user_input_event.wait()
        return self.user_input

    def handle_user_input(self, data: Any):
        """Handles the user input received from the frontend."""
        if not self.user_input_event.ready():
            self.user_input = data
            self.user_input_event.send()

    def automate_submission(self):
        """Performs the automation task for form submission."""
        try:
            self.emit_log('Starting automation process.')
            self.configure_genai()

            # Start Playwright in a separate thread to avoid Eventlet interference
            threading.Thread(target=self.run_playwright, daemon=True).start()

        except Exception as e:
            self.emit_log(f"Error occurred during automation initialization: {str(e)}")

    def run_playwright(self):
        """Runs Playwright operations."""
        try:
            # Start Playwright
            self.playwright = sync_playwright().start()
            self.browser = self.playwright.chromium.launch(headless=True)  # Set headless=False to see the browser actions
            context = self.browser.new_context()
            self.page = context.new_page()

            self.emit_log('Launching browser...')
            self.take_screenshot('Launching browser.')
            eventlet.sleep(1)  # Use eventlet's sleep

            # Step 1: Open Google and search for forms
            self.emit_log('Navigating to Google...')
            search_query = self.form_requirements
            self.page.goto(f'https://www.google.com/search?q={search_query}&sourceid=chrome&ie=UTF-8')
            self.take_screenshot('Navigated to Google.')
            eventlet.sleep(1)  # Delay for visibility

            # # Enter search query and perform search
            # self.page.fill('input[name="q"]', search_query)
            # self.page.keyboard.press('Enter')
            # eventlet.sleep(2)  # Delay for search results to load
            # self.take_screenshot(f'Searching for forms: {search_query}')
            # eventlet.sleep(1)

            # # Click on the first search result
            # first_result_selector = 'h3'
            # self.emit_log('Opening the first search result...')
            # first_result = self.page.query_selector(first_result_selector)
            # if first_result:
            #     first_result.click()
            #     eventlet.sleep(3)  # Delay to allow the page to load
            #     self.take_screenshot('Opened the first search result.')
            # else:
            #     self.emit_log('No search results found.')
            #     return
            
            self.page.goto('https://fluentforms.com/forms/contact-form-demo/')

            # Start the screenshot loop
            self.streaming = True
            self.screenshot_thread = eventlet.spawn_n(self.screenshot_loop)

            # Analyze the form fields using Gemini LLM
            self.emit_log('Analyzing form fields with Gemini LLM...')
            page_content = self.page.content()

            prompt = (
                "You are provided with the HTML content of a web form and user input data in JSON format. "
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
            self.emit_log('Received response from Gemini LLM.')
            try:
                form_data = json.loads(lml_response)
                form_fields = form_data.get("fields", [])
                submit_button = form_data.get("submit_button", {})
                confirmation_strategies = form_data.get("confirmation_strategies", [])
                self.emit_log('Successfully extracted form fields, submit button, and confirmation strategies.')
                self.take_screenshot('Extracted form details.')

                # Emit suggested fields to the frontend
                self.socketio.emit('suggested-fields', {
                    'fields': form_fields,
                    'confirmation_strategies': confirmation_strategies
                }, room=self.session_id)
            except json.JSONDecodeError:
                self.emit_log('Failed to parse Gemini LLM response.')
                return

            # Fill out the form based on extracted fields
            self.emit_log('Filling out the form fields...')
            for field in form_fields:
                field_name = field.get('name')
                selector = field.get('selector')
                field_type = field.get('type')
                value = field.get('value', '')

                if not value:
                    # Prompt user for missing data
                    prompt_msg = f"Please provide a value for the field '{field_name}' ({field.get('label')})."
                    user_value = self.prompt_user_for_input(prompt_msg)
                    value = user_value.get('value', '')  # Assuming the frontend sends {'value': 'user input'}

                    # If the field requires a file upload
                    if field_type == 'file':
                        self.socketio.emit('request-file-upload', {
                            'prompt': f"Please upload a file for the field '{field_name}' ({field.get('label')})."
                        }, room=self.session_id)
                        file_upload = self.prompt_user_for_input("file_upload")
                        # Assuming the frontend sends {'file': 'base64-encoded-file'}
                        file_b64 = file_upload.get('file', '')
                        # Save the file temporarily
                        file_path = f"temp_{self.session_id}_{field_name}.png"  # Adjust extension as needed
                        with open(file_path, "wb") as f:
                            f.write(base64.b64decode(file_b64))
                        value = file_path  # Path to the file

                if field_type in ['text', 'email', 'password', 'textarea']:
                    self.page.fill(selector, value)
                elif field_type in ['radio', 'checkbox']:
                    if isinstance(value, str):
                        if value.lower() in ['true', 'yes', '1']:
                            self.page.check(selector)
                    elif isinstance(value, bool) and value:
                        self.page.check(selector)
                elif field_type == 'select':
                    self.page.select_option(selector, value)
                elif field_type == 'file':
                    self.page.set_input_files(selector, value)  # 'value' should be the file path
                # Add more field types as necessary

                self.take_screenshot(f"Filled '{field_name}' field with value '{value}'.")
                eventlet.sleep(0.5)  # Use eventlet's sleep

            self.emit_log('Form fields filled.')
            self.take_screenshot('Form fields filled.')
            eventlet.sleep(1)

            # Submit the form
            self.emit_log('Submitting the form...')
            submit_selector = submit_button.get("selector", "button[type='submit']")
            self.page.click(submit_selector)
            self.take_screenshot('Clicked submit button.')
            eventlet.sleep(2)

            # Implement dynamic confirmation detection
            self.emit_log('Waiting for confirmation using dynamic strategies...')
            confirmation_detected = False
            for strategy in confirmation_strategies:
                strat_name = strategy.get("strategy")
                description = strategy.get("description")
                self.emit_log(f"Attempting confirmation strategy: {strat_name} - {description}")
                self.take_screenshot(f"Attempting confirmation strategy: {strat_name}")

                if strat_name == "success_message":
                    success_selectors = ["div.success", "p.success", ".alert-success", ".message.success"]
                    success_texts = ["Thank you", "successfully submitted", "we have received your", "your form has been submitted"]
                    for sel in success_selectors:
                        try:
                            element = self.page.query_selector(sel)
                            if element:
                                text_content = element.inner_text()
                                if any(text.lower() in text_content.lower() for text in success_texts):
                                    self.emit_log(f"Success message detected using selector '{sel}'.")
                                    confirmation_detected = True
                                    self.take_screenshot(f"Success message detected using selector '{sel}'.")
                                    break
                        except:
                            continue
                    if confirmation_detected:
                        break

                elif strat_name == "url_change":
                    original_url = self.page.url
                    try:
                        eventlet.sleep(5)  # Wait for potential URL change
                        new_url = self.page.url
                        if new_url != original_url:
                            self.emit_log(f"URL changed from {original_url} to {new_url}.")
                            confirmation_detected = True
                            self.take_screenshot(f"URL changed from {original_url} to {new_url}.")
                            break
                    except:
                        continue

                elif strat_name == "form_absence":
                    form_selectors = ["form", "div.form-container", "#contact-form"]
                    form_absent = True
                    for form_sel in form_selectors:
                        if self.page.query_selector(form_sel):
                            form_absent = False
                            break
                    if form_absent:
                        self.emit_log("Form is no longer present on the page.")
                        confirmation_detected = True
                        self.take_screenshot("Form is no longer present on the page.")
                        break

                else:
                    self.emit_log(f"Unknown confirmation strategy: {strat_name}")

            if confirmation_detected:
                self.emit_log('Form submitted successfully!')
                self.take_screenshot('Form submitted successfully.')
            else:
                self.emit_log('Confirmation not detected. Verify submission.')
                self.take_screenshot('Confirmation not detected.')

        except Exception as e:
            self.emit_log(f"Error occurred: {str(e)}")
        finally:
            if self.browser:
                self.browser.close()
            self.streaming = False
            self.emit_log('Automation process completed.')

    def receive_user_input(self, data: Any):
        """Receives user input from the frontend and sets the future result."""
        # This method will be called from the socket event
        self.user_input = data
        self.user_input_event.send()
