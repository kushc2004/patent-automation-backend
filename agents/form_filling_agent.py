# agents/form_filling_agent.py
import asyncio
import json
import os
from playwright.async_api import Page
from typing import Dict, Any, List
from flask_socketio import SocketIO
from utils.helper_functions import decode_base64_file
from agents.video_streaming_agent import VideoStreamingAgent
from agents.user_input_agent import UserInputAgent

class FormFillingAgent:
    def __init__(
        self,
        socketio: SocketIO,
        session_id: str,
        form_fields: List[Dict[str, Any]],
        confirmation_strategies: List[Dict[str, Any]],
        video_agent: VideoStreamingAgent,
        user_input_agent: UserInputAgent
    ):
        self.socketio = socketio
        self.session_id = session_id
        self.form_fields = form_fields  # List of form fields
        self.confirmation_strategies = confirmation_strategies
        self.video_agent = video_agent
        self.user_input_agent = user_input_agent

    async def fill_form(self, page: Page, input_data: Dict[str, Any]):
        """Fills out the form based on the extracted fields and input data."""
        try:
            await self.socketio.emit('process-log', {'message': 'Filling out the form fields...'}, room=self.session_id)
            for field in self.form_fields:
                field_name = field.get('name')
                selector = field.get('selector')
                field_type = field.get('type')
                value = field.get('value', '')

                if not value:
                    # Prompt user for missing data
                    prompt_msg = f"Please provide a value for the field '{field_name}' ({field.get('label')})."
                    user_response = await self.user_input_agent.prompt_user(prompt_msg, input_type='text')
                    value = user_response.get('value', '')

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
                elif field_type == 'file':
                    # Prompt user for file upload
                    prompt_msg = f"Please upload a file for the field '{field_name}' ({field.get('label')})."
                    self.socketio.emit('request-file-upload', {'prompt': prompt_msg}, room=self.session_id)
                    file_response = await self.user_input_agent.prompt_user(prompt_msg, input_type='file')
                    file_b64 = file_response.get('file', '')
                    file_path = decode_base64_file(file_b64, self.session_id, field_name)
                    if file_path:
                        await page.set_input_files(selector, file_path)
                        # Optionally, delete the temp file after upload
                        os.remove(file_path)
                    else:
                        await self.socketio.emit('process-log', {'message': f'Failed to upload file for field {field_name}.'}, room=self.session_id)
                # Add more field types as necessary

                await self.video_agent.take_screenshot(page, f"Filled '{field_name}' field with value '{value}'.")
                await asyncio.sleep(0.5)  # Delay for visibility

            await self.socketio.emit('process-log', {'message': 'Form fields filled.'}, room=self.session_id)
            await self.video_agent.take_screenshot(page, 'Form fields filled.')
        except Exception as e:
            await self.socketio.emit('process-log', {'message': f'Error filling form: {e}'}, room=self.session_id)

    async def submit_form(self, page: Page):
        """Submits the form and waits for confirmation."""
        try:
            await self.socketio.emit('process-log', {'message': 'Submitting the form...'}, room=self.session_id)
            submit_selector = self.form_fields[0].get("submit_button", {}).get("selector", "button[type='submit']")
            await page.click(submit_selector)
            await self.video_agent.take_screenshot(page, 'Clicked submit button.')
            await asyncio.sleep(2)  # Delay for submission processing

            await self.socketio.emit('process-log', {'message': 'Waiting for confirmation using dynamic strategies...'}, room=self.session_id)

            confirmation_detected = False
            for strategy in self.confirmation_strategies:
                strat_name = strategy.get("strategy")
                description = strategy.get("description")
                await self.socketio.emit('process-log', {'message': f"Attempting confirmation strategy: {strat_name} - {description}"}, room=self.session_id)
                await self.video_agent.take_screenshot(page, f"Attempting confirmation strategy: {strat_name}")

                if strat_name == "success_message":
                    success_selectors = ["div.success", "p.success", ".alert-success", ".message.success"]
                    success_texts = ["Thank you", "successfully submitted", "we have received your", "your form has been submitted"]
                    for sel in success_selectors:
                        try:
                            element = await page.query_selector(sel)
                            if element:
                                text_content = await element.inner_text()
                                if any(text.lower() in text_content.lower() for text in success_texts):
                                    await self.socketio.emit('process-log', {'message': f"Success message detected using selector '{sel}'."}, room=self.session_id)
                                    confirmation_detected = True
                                    await self.video_agent.take_screenshot(page, f"Success message detected using selector '{sel}'.")
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
                            await self.socketio.emit('process-log', {'message': f"URL changed from {original_url} to {new_url}."}, room=self.session_id)
                            confirmation_detected = True
                            await self.video_agent.take_screenshot(page, f"URL changed from {original_url} to {new_url}.")
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
                        await self.socketio.emit('process-log', {'message': "Form is no longer present on the page."}, room=self.session_id)
                        confirmation_detected = True
                        await self.video_agent.take_screenshot(page, "Form is no longer present on the page.")
                        break

                else:
                    await self.socketio.emit('process-log', {'message': f"Unknown confirmation strategy: {strat_name}"}, room=self.session_id)

            if confirmation_detected:
                await self.socketio.emit('process-log', {'message': 'Form submitted successfully!'}, room=self.session_id)
                await self.video_agent.take_screenshot(page, 'Form submitted successfully.')
            else:
                await self.socketio.emit('process-log', {'message': 'Confirmation not detected. Verify submission.'}, room=self.session_id)
                await self.video_agent.take_screenshot(page, 'Confirmation not detected.')
        except Exception as e:
            await self.socketio.emit('process-log', {'message': f'Error submitting form: {e}'}, room=self.session_id)
