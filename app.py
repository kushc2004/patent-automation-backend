# app.py
import eventlet
eventlet.monkey_patch()

import os
import uuid
import asyncio
import json
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room
from dotenv import load_dotenv
from playwright.async_api import async_playwright
import google.generativeai as genai

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'Legal.ai*2024'  # Replace with a strong secret key
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",
            "https://legalai-frontend.onrender.com",
            "https://banthry.in",
            "https://www.banthry.in"
        ]
    }
})
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins="*")

print("Server started.")

# Gemini LLM Client Function
def gemini_client(prompt, file_paths = []):
    # gemini_api_key = os.getenv("GEMINI_API_KEY")
    genai.configure(api_key="AIzaSyBa2Boeqwb-nTZ_6IZxesRbawOBasBQr1E")  # Securely load API key from environment
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash-latest",
        generation_config={
            "temperature": 0.2,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
            "response_mime_type": "application/json",
        }
    )
    if file_paths:
        uploaded_files = [genai.upload_file(file) for file in file_paths]
        response = model.generate_content([prompt] + uploaded_files)
    else:
        response = model.generate_content(prompt)
    return response.text

@app.route('/api/submit', methods=['POST'])
def submit():
    """Handles form submission requests."""
    data = request.get_json()
    input_data = data.get('inputData', '')
    session_id = str(uuid.uuid4())

    # Start the automation in the background
    eventlet.spawn_n(asyncio.run, automate_submission(input_data, session_id))
    return jsonify({'session_id': session_id}), 200

@socketio.on('join')
def on_join(data):
    """Handles a client joining a session room."""
    session_id = data.get('session_id')
    if session_id:
        join_room(session_id)
        print(f"Client joined room: {session_id}")
    else:
        print("Error: No session_id provided in join event.")

async def automate_submission(input_data, session_id):
    """Performs the automation task for form submission."""
    try:
        print(f"Starting automation for session: {session_id}")
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)  # Set headless=True for server environments
            context = await browser.new_context()
            page = await context.new_page()

            await emit_log(session_id, 'Launching browser...')
            await page.goto('https://fluentforms.com/forms/contact-form-demo/')
            await emit_log(session_id, 'Navigated to form website.')
            print(f"Navigated to form website for session: {session_id}")
            await take_screenshot(page, session_id, 'Navigated to form website.')

            # Analyze the page to find input fields using Gemini LLM
            await emit_log(session_id, 'Analyzing form fields with Gemini LLM...')
            page_content = await page.content()

            # Updated prompt with confirmation strategies
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
                f"User Input Data:\n{input_data}\n\n"
                f"HTML Content:\n{page_content}"
            )

            lml_response = gemini_client(prompt)
            print(f"\n### LLM Response ###\n{lml_response}\n##\n")
            try:
                form_data = json.loads(lml_response)
                form_fields = form_data.get("fields", [])
                submit_button = form_data.get("submit_button", {})
                confirmation_strategies = form_data.get("confirmation_strategies", [])
                await emit_log(session_id, 'Successfully extracted form fields, submit button, and confirmation strategies.')
                print(f"Form fields extracted for session {session_id}: {form_fields}")
                print(f"Submit button: {submit_button}")
                print(f"Confirmation strategies: {confirmation_strategies}")

                # Optionally, emit suggested fields to the frontend
                socketio.emit('suggested-fields', {'fields': form_fields, 'confirmation_strategies': confirmation_strategies}, room=session_id)
            except json.JSONDecodeError:
                await emit_log(session_id, 'Failed to parse Gemini LLM response.')
                print(f"Error parsing Gemini response for session {session_id}: {lml_response}")
                return

            # Fill out the form based on extracted fields
            await emit_log(session_id, 'Filling out the form fields...')
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

                await take_screenshot(page, session_id, f"Filled '{field_name}' field with value '{value}'.")

            await emit_log(session_id, 'Form fields filled.')
            await take_screenshot(page, session_id, 'Form fields filled.')

            # Submit the form
            await emit_log(session_id, 'Submitting the form...')
            submit_selector = submit_button.get("selector", "button[type='submit']")  # Default selector
            await page.click(submit_selector)
            await take_screenshot(page, session_id, 'Clicked submit button.')

            # Implement dynamic confirmation detection
            await emit_log(session_id, 'Waiting for confirmation using dynamic strategies...')
            confirmation_detected = False
            for strategy in confirmation_strategies:
                strat_name = strategy.get("strategy")
                description = strategy.get("description")
                await emit_log(session_id, f"Attempting confirmation strategy: {strat_name} - {description}")

                if strat_name == "success_message":
                    # Example: Look for common success messages
                    success_selectors = ["div.success", "p.success", ".alert-success", ".message.success"]
                    success_texts = ["Thank you", "successfully submitted", "we have received your", "your form has been submitted"]
                    for sel in success_selectors:
                        try:
                            if await page.query_selector(sel):
                                text_content = await page.inner_text(sel)
                                if any(text.lower() in text_content.lower() for text in success_texts):
                                    await emit_log(session_id, f"Success message detected using selector '{sel}'.")
                                    confirmation_detected = True
                                    break
                        except:
                            continue
                    if confirmation_detected:
                        break

                elif strat_name == "url_change":
                    # Detect if the URL has changed after submission
                    original_url = page.url
                    try:
                        await page.wait_for_timeout(5000)  # Wait for potential URL change
                        new_url = page.url
                        if new_url != original_url:
                            await emit_log(session_id, f"URL changed from {original_url} to {new_url}.")
                            confirmation_detected = True
                            break
                    except:
                        continue

                elif strat_name == "form_absence":
                    # Check if the form is no longer present
                    form_selectors = ["form", "div.form-container", "#contact-form"]
                    form_absent = True
                    for form_sel in form_selectors:
                        if await page.query_selector(form_sel):
                            form_absent = False
                            break
                    if form_absent:
                        await emit_log(session_id, "Form is no longer present on the page.")
                        confirmation_detected = True
                        break

                # Add more strategies as defined by the LLM
                else:
                    await emit_log(session_id, f"Unknown confirmation strategy: {strat_name}")

            if confirmation_detected:
                await emit_log(session_id, 'Form submitted successfully!')
                await take_screenshot(page, session_id, 'Form submitted successfully.')
            else:
                await emit_log(session_id, 'Confirmation not detected. Verify submission.')
                await take_screenshot(page, session_id, 'Confirmation not detected.')

    except Exception as e:
        print(f"Error in automation for session {session_id}: {str(e)}")
        await emit_log(session_id, f"Error occurred: {str(e)}")
    finally:
        if 'browser' in locals():
            await browser.close()
        print(f"Automation completed for session: {session_id}")

async def emit_log(session_id, message):
    """Emits a log message to the session room."""
    socketio.emit('process-log', {'message': message}, room=session_id)

async def take_screenshot(page, session_id, step_description):
    """Takes a screenshot and emits it to the session room."""
    try:
        print(f"Taking screenshot for session: {session_id}, step: {step_description}")
        screenshot_bytes = await page.screenshot()  # Capture screenshot as bytes
        screenshot_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')  # Encode as Base64
        print(f"Screenshot captured for session: {session_id}, step: {step_description}")

        # Emit the screenshot and log
        socketio.emit('process-screenshot', {
            'description': step_description,
            'screenshot': screenshot_b64
        }, room=session_id)
        await emit_log(session_id, f"Screenshot taken: {step_description}")
    except Exception as e:
        print(f"Error in taking screenshot for session {session_id}: {str(e)}")
        await emit_log(session_id, f"Failed to take screenshot: {str(e)}")

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
