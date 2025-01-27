# app.py
import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room
import uuid
import asyncio
from playwright.async_api import async_playwright
import binascii
import base64

app = Flask(__name__)
app.config['SECRET_KEY'] = 'Legal.ai*2024'  # Replace with a strong secret key
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins="*")

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

print("Server started.")

@app.route('/api/submit', methods=['POST'])
def submit():
    """Handles form submission requests."""
    data = request.get_json()
    session_id = str(uuid.uuid4())
    # Start the automation in the background
    socketio.start_background_task(automate_submission, data, session_id)
    return jsonify({'session_id': session_id}), 200


@socketio.on('join')
def on_join(data):
    """Handles a client joining a session room."""
    session_id = data['session_id']
    join_room(session_id)
    print(f'Client joined room: {session_id}')


async def automate_submission(user_data, session_id):
    """Performs the automation task for form submission."""
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context()
            page = await context.new_page()

            await emit_log(session_id, 'Launching browser...')
            await page.goto('https://fluentforms.com/forms/contact-form-demo/')
            await emit_log(session_id, 'Navigated to form website.')
            await take_screenshot(page, session_id, 'Navigated to form website.')

            # Fill out the form
            await emit_log(session_id, 'Filling out the form...')
            await page.fill('#name', user_data.get('name', ''))
            await page.fill('#email', user_data.get('email', ''))
            # Add other form fields as necessary
            await take_screenshot(page, session_id, 'Filled out the form.')

            # Submit the form
            await emit_log(session_id, 'Submitting the form...')
            await page.click('#submit-button')
            await take_screenshot(page, session_id, 'Clicked submit button.')

            # Wait for confirmation
            await emit_log(session_id, 'Waiting for confirmation...')
            try:
                await page.wait_for_selector('#confirmation', timeout=10000)
                await emit_log(session_id, 'Form submitted successfully!')
                await take_screenshot(page, session_id, 'Form submitted successfully.')
            except Exception:
                await emit_log(session_id, 'Confirmation message not found. Verify submission.')

    except Exception as e:
        await emit_log(session_id, f'Error occurred: {str(e)}')
    finally:
        if 'browser' in locals():
            await browser.close()


async def emit_log(session_id, message):
    """Emits a log message to the session room."""
    socketio.emit('process-log', {'message': message}, room=session_id)


async def take_screenshot(page, session_id, step_description):
    try:
        screenshot = await page.screenshot(full_page=False, quality=50)
        screenshot_base64 = base64.b64encode(screenshot).decode('utf-8')
        print(f"Emitting screenshot for session {session_id}: {screenshot_base64[:50]}...")  # First 50 chars for verification
        socketio.emit('process-screenshot', {
            'description': step_description,
            'screenshot': screenshot_base64
        }, room=session_id)
        await emit_log(session_id, f'Screenshot taken: {step_description}')
    except Exception as e:
        await emit_log(session_id, f'Failed to take screenshot: {str(e)}')


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
