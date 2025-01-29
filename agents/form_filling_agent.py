# agents/form_filling_agent.py

import asyncio
import json
import uuid
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
from utils.gemini_client import gemini_client
from utils.logger import log_info, log_error
from utils.webrtc_publisher import WebRTCPublisher

class FormFillingAgent:
    def __init__(self, target_url, user_data, session_id, socketio):
        self.target_url = target_url
        self.user_data = user_data
        self.session_id = session_id
        self.socketio = socketio
        self.form_fields = []
        self.publisher = None  # Will be initialized later

    async def fill_and_submit_form(self):
        """
        Automates the process of filling out and submitting the form on the target website.
        Streams the browser's video to Janus via WebRTC.
        """
        try:
            log_info(f"FormFillingAgent: Starting form automation for {self.target_url}")
            await self.emit_log("Launching browser and navigating to the target website.")
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=False)  # Headed for live streaming
                context = await browser.new_context(viewport={"width": 1280, "height": 720})
                page = await context.new_page()

                # Initialize WebRTC Publisher
                janus_url = "http://34.72.243.95:8088/janus"  # Replace with your Janus endpoint
                room_id = 1234  # Ensure this matches the frontend's room ID
                display_name = f"Publisher-{self.session_id}"
                self.publisher = WebRTCPublisher(janus_url, room_id, display_name, page)
                await self.publisher.start_publishing()

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
                            await self.publisher.stop_publishing()
                            return
                    else:
                        await self.emit_log("Failed to navigate to the form page.")
                        log_error("FormFillingAgent: Failed to navigate to the form page.")
                        await browser.close()
                        await self.publisher.stop_publishing()
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
                    await self.publisher.stop_publishing()
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
                    await self.publisher.stop_publishing()
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
                await self.publisher.stop_publishing()
                log_info(f"FormFillingAgent: Automation completed for session {self.session_id}")

        except Exception as e:
            await self.emit_log(f"FormFillingAgent Error: {str(e)}")
            log_error(f"FormFillingAgent Error: {str(e)}")
            if self.publisher:
                await self.publisher.stop_publishing()

    # The remaining methods (construct_gemini_prompt, parse_response, emit_log, request_user_file, navigate_to_form_page,
    # find_form_selector, find_submit_selector, find_confirmation_selector, handle_form_download) remain unchanged.
    # Ensure they are present in the file as in your original code.
