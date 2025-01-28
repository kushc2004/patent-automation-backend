# agents/form_filling_agent.py

import asyncio
import json
import base64
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
from utils.gemini_client import gemini_client
from utils.logger import log_info, log_error

class FormFillingAgent:
    def __init__(self, target_url, user_data, session_id, socketio):
        self.target_url = target_url
        self.user_data = user_data
        self.session_id = session_id
        self.socketio = socketio
        self.form_fields = []

    async def fill_and_submit_form(self):
        """
        Automates the process of filling out and submitting the form on the target website.
        """
        try:
            log_info(f"FormFillingAgent: Starting form automation for {self.target_url}")
            await self.emit_log("Launching browser and navigating to the target website.")
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=False)  # Headed for live streaming
                context = await browser.new_context(viewport={"width": 1280, "height": 720})
                page = await context.new_page()
                await page.goto(self.target_url, timeout=60000)
                log_info("FormFillingAgent: Navigated to the target website.")
                await self.emit_log("Navigated to the target website.")
                await asyncio.sleep(2)  # Wait for the page to load

                # Attempt to locate the form on the current page
                form_selector = await self.find_form_selector(page)
                if not form_selector:
                    # If form not found, attempt to navigate to form page
                    await self.emit_log("Form not found on the landing page. Attempting to navigate to the form page.")
                    form_page_url = await self.navigate_to_form_page(page)
                    if form_page_url:
                        await self.emit_log(f"Navigated to form page: {form_page_url}")
                        await page.goto(form_page_url, timeout=60000)
                        await asyncio.sleep(2)
                        form_selector = await self.find_form_selector(page)
                        if not form_selector:
                            await self.emit_log("Form still not found after navigation.")
                            log_error("FormFillingAgent: Form not found after navigating to form page.")
                            await browser.close()
                            return
                    else:
                        await self.emit_log("Failed to navigate to the form page.")
                        log_error("FormFillingAgent: Failed to navigate to the form page.")
                        await browser.close()
                        return

                await self.emit_log("Form located on the website.")
                log_info("FormFillingAgent: Form located on the website.")

                # Extract form HTML
                form_html = await page.inner_html(form_selector)
                await self.emit_log("Analyzing form fields with Gemini LLM.")
                log_info("FormFillingAgent: Extracting form fields using Gemini LLM.")

                # Construct prompt for Gemini
                prompt = self.construct_gemini_prompt(form_html)
                lml_response = gemini_client(prompt)
                self.form_fields = self.parse_response(lml_response)
                if not self.form_fields:
                    await self.emit_log("Failed to extract form fields.")
                    log_error("FormFillingAgent: Failed to extract form fields.")
                    await browser.close()
                    return

                await self.emit_log("Successfully extracted form fields.")
                log_info(f"FormFillingAgent: Extracted fields: {self.form_fields}")

                # Fill out the form fields
                await self.emit_log("Filling out the form fields.")
                for field in self.form_fields:
                    field_name = field.get('name')
                    selector = field.get('selector')
                    field_type = field.get('type')
                    value = self.user_data.get(field_name, '')

                    if field_type in ['text', 'email', 'password']:
                        await page.fill(selector, value)
                    elif field_type in ['radio', 'checkbox']:
                        if value:
                            await page.check(selector)
                    elif field_type == 'select':
                        await page.select_option(selector, value)
                    elif field_type == 'file':
                        file_path = self.user_data.get(field_name)
                        if file_path:
                            await page.set_input_files(selector, file_path)
                        else:
                            # Trigger user input for file upload
                            await self.emit_log(f"File required for field '{field_name}'. Awaiting user upload.")
                            file_path = await self.request_user_file(field_name)
                            if file_path:
                                await page.set_input_files(selector, file_path)
                            else:
                                await self.emit_log(f"File upload for '{field_name}' was not provided.")
                    # Add more field types as necessary

                    await self.emit_log(f"Filled '{field_name}' field.")
                    log_info(f"FormFillingAgent: Filled '{field_name}' field with value '{value}'.")

                await self.emit_log("Form fields filled.")
                log_info("FormFillingAgent: All form fields filled.")

                # Submit the form
                submit_selector = await self.find_submit_selector(page, form_selector)
                if submit_selector:
                    await page.click(submit_selector)
                    await self.emit_log("Clicked submit button.")
                    log_info("FormFillingAgent: Clicked submit button.")
                    await asyncio.sleep(3)  # Wait for submission to process
                else:
                    await self.emit_log("Submit button not found.")
                    log_error("FormFillingAgent: Submit button not found.")
                    await browser.close()
                    return

                # Wait for confirmation
                confirmation_selector = await self.find_confirmation_selector(page)
                try:
                    await page.wait_for_selector(confirmation_selector, timeout=10000)
                    await self.emit_log("Form submitted successfully!")
                    log_info("FormFillingAgent: Form submitted successfully.")
                except PlaywrightTimeoutError:
                    await self.emit_log("Confirmation message not found. Verify submission.")
                    log_error("FormFillingAgent: Confirmation message not found.")
                
                await browser.close()
                log_info(f"FormFillingAgent: Automation completed for session {self.session_id}")

        except Exception as e:
            await self.emit_log(f"FormFillingAgent Error: {str(e)}")
            log_error(f"FormFillingAgent Error: {str(e)}")

    def construct_gemini_prompt(self, form_html):
        """
        Constructs a prompt for Gemini LLM to analyze form fields.
        Includes an example format for clarity.
        """
        prompt = (
            "Analyze the following HTML content of a form and identify all input fields with their corresponding labels and CSS selectors. "
            "Provide the information in a JSON array format where each element contains 'label', 'name', 'type', and 'selector'. "
            "Ensure the JSON is properly structured and parsable.\n\n"
            "Example:\n"
            "[\n"
            "  {\n"
            "    \"label\": \"First Name\",\n"
            "    \"name\": \"first_name\",\n"
            "    \"type\": \"text\",\n"
            "    \"selector\": \"#first-name\"\n"
            "  },\n"
            "  {\n"
            "    \"label\": \"Email\",\n"
            "    \"name\": \"email\",\n"
            "    \"type\": \"email\",\n"
            "    \"selector\": \"#email\"\n"
            "  }\n"
            "]\n\n"
            "HTML Content:\n"
            f"{form_html}"
        )
        return prompt

    def parse_response(self, response):
        """
        Parses the Gemini LLM response to extract form fields.
        Expects the response in JSON array format.
        """
        try:
            data = json.loads(response)
            fields = data  # Assuming response is a JSON array
            return fields
        except json.JSONDecodeError:
            log_error("FormFillingAgent: Failed to parse Gemini response.")
            return []

    async def emit_log(self, message):
        """Emits a log message to the session room."""
        self.socketio.emit('process-log', {'message': message}, room=self.session_id)

    async def request_user_file(self, field_name):
        """
        Sends a prompt to the frontend to request a file upload for the specified field.
        Waits for the frontend to send the file path.
        """
        await self.emit_log(f"Field '{field_name}' requires a file upload.")
        # Emit event to frontend to prompt for file upload
        self.socketio.emit('request-file-upload', {
            'session_id': self.session_id,
            'field_name': field_name,
            'message': f"Please upload a file for the field '{field_name}'."
        }, room=self.session_id)

        # Wait for the file upload to be received via UserInputAgent
        loop = asyncio.get_event_loop()
        file_path = await loop.run_in_executor(None, lambda: user_input_agent.wait_for_file_upload(self.session_id, field_name))
        return file_path

    async def navigate_to_form_page(self, page):
        """
        Attempts to navigate to the form page by searching for links/buttons that likely lead to forms.
        Utilizes Gemini LLM to identify possible navigation paths.
        """
        try:
            # Get all links on the page
            links = await page.query_selector_all('a')
            link_texts = []
            for link in links:
                text = await link.inner_text()
                href = await link.get_attribute('href')
                if href:
                    link_texts.append({'text': text, 'href': href})

            # Construct prompt for Gemini to identify the correct link to the form page
            prompt = (
                "Given a list of links on a webpage, identify the most likely link that leads to a form for patent submission. "
                "Provide the 'href' of the link in plain text.\n\n"
                "Links:\n"
            )
            for link in link_texts:
                prompt += f"Text: {link['text']}, Href: {link['href']}\n"

            prompt += "\nMost likely link href:"

            # Use Gemini to identify the correct link
            response = gemini_client(prompt)
            form_href = response.strip()

            # Validate and navigate to the form page
            if form_href:
                if form_href.startswith('/'):
                    # Relative URL
                    base_url = page.url
                    form_page_url = requests.compat.urljoin(base_url, form_href)
                elif form_href.startswith('http'):
                    form_page_url = form_href
                else:
                    # Other cases
                    form_page_url = form_href

                log_info(f"FormFillingAgent: Navigating to form page URL: {form_page_url}")
                await page.goto(form_page_url, timeout=60000)
                return form_page_url
            else:
                log_error("FormFillingAgent: Gemini failed to identify form page link.")
                return None

        except Exception as e:
            log_error(f"FormFillingAgent: Error navigating to form page: {str(e)}")
            return None

    async def find_form_selector(self, page):
        """
        Attempts to find the form selector on the current page.
        Returns the selector string if found, else None.
        """
        try:
            forms = await page.query_selector_all('form')
            if forms:
                # Return the first form's selector
                form = forms[0]
                form_id = await form.get_attribute('id')
                form_class = await form.get_attribute('class')
                if form_id:
                    return f'#{form_id}'
                elif form_class:
                    # Assuming the first class is sufficient
                    first_class = form_class.split()[0]
                    return f'.{first_class}'
                else:
                    return 'form'  # Generic selector
            return None
        except Exception as e:
            log_error(f"FormFillingAgent: Error finding form selector: {str(e)}")
            return None

    async def find_submit_selector(self, page, form_selector):
        """
        Attempts to find the submit button within the form.
        Returns the selector string if found, else None.
        """
        try:
            submit_button = await page.query_selector(f"{form_selector} input[type='submit'], {form_selector} button[type='submit']")
            if submit_button:
                # Attempt to get a unique selector
                submit_id = await submit_button.get_attribute('id')
                submit_class = await submit_button.get_attribute('class')
                if submit_id:
                    return f'#{submit_id}'
                elif submit_class:
                    # Assuming the first class is sufficient
                    first_class = submit_class.split()[0]
                    return f'.{first_class}'
                else:
                    return 'button[type="submit"]'
            else:
                return None
        except Exception as e:
            log_error(f"FormFillingAgent: Error finding submit button: {str(e)}")
            return None

    async def find_confirmation_selector(self, page):
        """
        Attempts to find a confirmation message selector after form submission.
        Returns the selector string if found, else a generic success message.
        """
        # Common selectors for confirmation messages
        possible_selectors = [
            '#confirmation',
            '.confirmation',
            '#success',
            '.success',
            'div.alert-success',
            'span.success-message',
            'div.message-success',
            'p.thank-you'
        ]
        for selector in possible_selectors:
            if await page.is_visible(selector):
                return selector
        return 'div'  # Fallback

    async def handle_form_download(self, page):
        """
        Handles downloading the filled form as a PDF if the option is available.
        """
        try:
            download_button = await page.query_selector('button#download-pdf, a#download-pdf')
            if download_button:
                await download_button.click()
                await self.emit_log("Clicked download PDF button.")
                log_info("FormFillingAgent: Clicked download PDF button.")
                await asyncio.sleep(2)  # Wait for download to process
            else:
                await self.emit_log("Download PDF option not available.")
                log_info("FormFillingAgent: Download PDF option not available.")
        except Exception as e:
            await self.emit_log(f"Failed to handle form download: {str(e)}")
            log_error(f"FormFillingAgent: Failed to handle form download: {str(e)}")

