# app.py

import os
import uuid
import asyncio
import json
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

from agents.search_agent import SearchAgent
from agents.form_filling_agent import FormFillingAgent
from agents.user_input_agent import UserInputAgent
from utils.logger import log_info, log_error

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'Legal.ai*2024')  # Use env variable
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

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

# Initialize SocketIO with asyncio
socketio = SocketIO(app, async_mode='asyncio', cors_allowed_origins="*")

print("Server started.")

# Initialize UserInputAgent
user_input_agent = UserInputAgent(socketio)

# Store agents per session (optional, if needed for more complex interactions)
session_agents = {}

@app.route('/api/submit', methods=['POST'])
async def submit():
    """Handles form submission requests."""
    data = request.get_json()
    session_id = str(uuid.uuid4())
    log_info(f"Received submission request for session: {session_id}")

    # Extract requirements from user data
    requirements = data.get('requirements', 'Submit patent forms based on user data.')

    # Store user data
    session_agents[session_id] = {
        'user_data': data
    }

    # Start the automation in the background
    socketio.start_background_task(asyncio.create_task, automation_workflow(data, session_id))
    return jsonify({'session_id': session_id}), 200

@socketio.on('join')
async def on_join(data):
    """Handles a client joining a session room."""
    session_id = data.get('session_id')
    if session_id:
        join_room(session_id)
        log_info(f"Client joined room: {session_id}")
    else:
        log_error("Error: No session_id provided in join event.")

@socketio.on('file-upload')
async def handle_file_upload_event(data):
    """
    Handles file upload events from the frontend.
    Expects base64 encoded file data.
    """
    session_id = data.get('session_id')
    field_name = data.get('field_name')
    file = data.get('file')  # Expecting base64 encoded file

    if not session_id or not field_name or not file:
        log_error("Invalid file upload data received.")
        return

    try:
        # Decode the base64 file
        file_data = base64.b64decode(file)
        filename = secure_filename(f"{session_id}_{field_name}.pdf")  # Assuming PDF; adjust as needed
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        with open(file_path, 'wb') as f:
            f.write(file_data)

        # Notify the UserInputAgent about the uploaded file
        user_input_agent.handle_file_upload(session_id, field_name, file_path)

        log_info(f"File uploaded for session {session_id}, field '{field_name}': {file_path}")
    except Exception as e:
        log_error(f"Error handling file upload: {str(e)}")

async def automation_workflow(user_data, session_id):
    """
    Coordinates the workflow using different agents.
    """
    try:
        # Step 1: Search for websites
        search_agent = SearchAgent(user_data.get('requirements', 'Patent submission'))
        search_results = await search_agent.search_websites()
        if not search_results:
            await emit_log(session_id, "No websites found based on the requirements.")
            return

        # Step 2: Select the first website
        target_url = search_results[0]
        await emit_log(session_id, f"Selected website: {target_url}")
        log_info(f"Automation workflow: Selected website {target_url} for session {session_id}")

        # Step 3: Form Filling
        form_filling_agent = FormFillingAgent(
            target_url=target_url,
            user_data=user_data,
            session_id=session_id,
            socketio=socketio
        )
        await form_filling_agent.fill_and_submit_form()

    except Exception as e:
        await emit_log(session_id, f"Automation workflow Error: {str(e)}")
        log_error(f"Automation workflow Error for session {session_id}: {str(e)}")

async def emit_log(session_id, message):
    """Emits a log message to the session room."""
    socketio.emit('process-log', {'message': message}, room=session_id)

if __name__ == '__main__':
    import asyncio
    import uvicorn

    # Use Uvicorn as the ASGI server
    import nest_asyncio
    nest_asyncio.apply()

    # Run the app with Uvicorn
    socketio.run(app, host='0.0.0.0', port=5000)
