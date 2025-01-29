# app.py
import eventlet
eventlet.monkey_patch()

import os
import uuid
import asyncio
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room
from dotenv import load_dotenv
from agents import AutomateSubmissionAgent  # Import the new agent class
from typing import Dict, Any, List

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

# Dictionary to keep track of agents by session_id
agents_dict: Dict[str, AutomateSubmissionAgent] = {}


@app.route('/api/submit', methods=['POST'])
def submit():
    """Handles form submission requests."""
    data = request.get_json()
    input_data = data.get('inputData', {})
    form_requirements = data.get('formRequirements', 'contact forms')  # Get form search requirements
    session_id = str(uuid.uuid4())

    # Instantiate the agent and start the automation in the background
    agent = AutomateSubmissionAgent(socketio, session_id, input_data, form_requirements)
    agents_dict[session_id] = agent
    eventlet.spawn_n(asyncio.run, agent.automate_submission())
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


@socketio.on('user-input')
def handle_user_input_event(data):
    """Handles user input sent from the frontend."""
    session_id = data.get('session_id')
    user_input = data.get('input')  # This should be a dictionary containing the required data

    if session_id in agents_dict:
        agent = agents_dict[session_id]
        agent.receive_user_input(user_input)
    else:
        print(f"No agent found for session_id: {session_id}")


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
