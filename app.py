# app.py

from flask import Flask, request, jsonify
from flask_socketio import SocketIO, join_room
import eventlet
import uuid
import asyncio
from playwright.async_api import async_playwright

eventlet.monkey_patch()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'Legal.ai*2024'  # Replace with a strong secret key
socketio = SocketIO(app, async_mode='eventlet')

@app.route('/api/submit', methods=['POST'])
def submit():
    data = request.get_json()
    session_id = str(uuid.uuid4())
    # Start the automation in the background
    socketio.start_background_task(automate_submission, data, session_id)
    return jsonify({'session_id': session_id}), 200

@socketio.on('join')
def on_join(data):
    session_id = data['session_id']
    join_room(session_id)
    print(f'Client joined room: {session_id}')

async def automate_submission(user_data, session_id):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            await emit_log(session_id, 'Launching browser...')
            await page.goto('https://fluentforms.com/forms/contact-form-demo/')
            await emit_log(session_id, 'Navigated to patent filing website.')
            await take_screenshot(page, session_id, 'Navigated to patent filing website.')

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
            await page.wait_for_selector('#confirmation', timeout=10000)
            await emit_log(session_id, 'Form submitted successfully!')
            await take_screenshot(page, session_id, 'Form submitted successfully.')

        except Exception as e:
            await emit_log(session_id, f'Error: {str(e)}')
        finally:
            await browser.close()

async def emit_log(session_id, message):
    socketio.emit('process-log', message, room=session_id)

async def take_screenshot(page, session_id, step_description):
    screenshot = await page.screenshot()
    screenshot_base64 = screenshot.hex()
    # Convert hex to base64
    import binascii, base64
    screenshot_bytes = binascii.unhexlify(screenshot_base64)
    screenshot_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')
    socketio.emit('process-screenshot', screenshot_b64, room=session_id)
    await emit_log(session_id, f'Screenshot taken: {step_description}')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
