# app.py
import eventlet
eventlet.monkey_patch()

import os
import uuid
import asyncio
import binascii
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
    genai.configure(api_key="AIzaSyBa2Boeqwb-nTZ_6IZxesRbawOBasBQr1E")
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

# @app.route('/api/submit', methods=['POST'])
# def submit():
#     """Handles form submission requests."""
#     data = request.get_json()
#     session_id = str(uuid.uuid4())

#     # Start the automation in the background
#     socketio.start_background_task(automate_submission, data, session_id)
#     return jsonify({'session_id': session_id}), 200

@app.route('/api/submit', methods=['POST'])
def submit():
    """Handles form submission requests."""
    data = request.get_json()
    session_id = str(uuid.uuid4())

    # Start the automation in the background
    eventlet.spawn_n(asyncio.run, automate_submission(data, session_id))
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

async def automate_submission(user_data, session_id):
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
            prompt = (
                "You are analyzing the HTML content of a web form. Your task is to identify all input fields and buttons, "
                "and return them as a structured JSON. Each input field should include the following information: \n"
                "- `label`: The label text or placeholder text for the input field.\n"
                "- `name`: The name attribute of the field (if available).\n"
                "- `type`: The type of the field (e.g., text, email, password, checkbox, radio, select, etc.).\n"
                "- `selector`: A CSS selector to uniquely identify the field.\n"
                "\n"
                "Additionally, identify the submit button dynamically using its type, name, or text content.\n"
                "\n"
                "Return the output in a JSON format as shown below:\n"
                "```json\n"
                "{\n"
                "  \"fields\": [\n"
                "    {\n"
                "      \"label\": \"Full Name\",\n"
                "      \"name\": \"name\",\n"
                "      \"type\": \"text\",\n"
                "      \"selector\": \"#name\"\n"
                "    },\n"
                "    {\n"
                "      \"label\": \"Email Address\",\n"
                "      \"name\": \"email\",\n"
                "      \"type\": \"email\",\n"
                "      \"selector\": \"#email\"\n"
                "    }\n"
                "  ],\n"
                "  \"submit_button\": {\n"
                "    \"text\": \"Submit\",\n"
                "    \"selector\": \"button[type='submit']\"\n"
                "  }\n"
                "}\n"
                "```"
                "\n"
                "Ensure the JSON output is properly structured and parsable.\n\n"
                f"HTML Content:\n{page_content}"
            )

            lml_response = gemini_client(prompt)
            print(f"\n### LLM Response ###\n{lml_response}\n##\n")
            try:
                form_data = json.loads(lml_response)
                form_fields = form_data.get("fields", [])
                submit_button = form_data.get("submit_button", {})
                await emit_log(session_id, 'Successfully extracted form fields and submit button.')
                print(f"Form fields extracted for session {session_id}: {form_fields}")
                print(f"Submit button: {submit_button}")
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
                value = user_data.get(field_name, '')
                if field_type == 'text' or field_type == 'email' or field_type == 'password':
                    await page.fill(selector, value)
                elif field_type == 'radio' or field_type == 'checkbox':
                    if value:
                        await page.check(selector)
                elif field_type == 'select':
                    await page.select_option(selector, value)
                # Add more field types as necessary
                await take_screenshot(page, session_id, f"Filled '{field_name}' field.")

            await emit_log(session_id, 'Form fields filled.')
            await take_screenshot(page, session_id, 'Form fields filled.')

            # Submit the form
            await emit_log(session_id, 'Submitting the form...')
            submit_selector = submit_button.get("selector", "button[type='submit']")  # Default selector
            await page.click(submit_selector)
            await take_screenshot(page, session_id, 'Clicked submit button.')

            # Wait for confirmation
            await emit_log(session_id, 'Waiting for confirmation...')
            try:
                await page.wait_for_selector('#confirmation', timeout=10000)  # Adjust selector based on actual confirmation element
                await emit_log(session_id, 'Form submitted successfully!')
                await take_screenshot(page, session_id, 'Form submitted successfully.')
            except asyncio.TimeoutError:
                await emit_log(session_id, 'Confirmation message not found. Verify submission.')
                await take_screenshot(page, session_id, 'Confirmation message not found.')

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
    import json
    socketio.run(app, host='0.0.0.0', port=5000)
