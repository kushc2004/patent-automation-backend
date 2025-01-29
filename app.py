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
from agents import SearchAgent, FormFillingAgent, VideoStreamingAgent, UserInputAgent
from typing import Dict, Any
import google.generativeai as genai
import json


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
agents_dict: Dict[str, Dict[str, Any]] = {}

@app.route('/api/submit', methods=['POST'])
def submit():
    """Handles form submission requests."""
    data = request.get_json()
    input_data = data.get('inputData', {})
    form_requirements = data.get('formRequirements', 'contact forms')  # Get form search requirements
    session_id = str(uuid.uuid4())

    # Create VideoStreamingAgent
    video_agent = VideoStreamingAgent(socketio, session_id)

    # Create UserInputAgent
    user_input_agent = UserInputAgent(socketio, session_id)

    # Store agents in the dictionary
    agents_dict[session_id] = {
        'video_agent': video_agent,
        'user_input_agent': user_input_agent,
        'search_agent': None,
        'form_filling_agent': None
    }

    # Start video streaming
    video_agent.start_streaming()

    # Start automation in the background
    eventlet.spawn_n(asyncio.run, automate_process(session_id, input_data, form_requirements))

    return jsonify({'session_id': session_id}), 200

async def automate_process(session_id: str, input_data: Dict[str, Any], form_requirements: str):
    """Coordinates the automation process using different agents."""
    agents = agents_dict.get(session_id, {})
    video_agent: VideoStreamingAgent = agents.get('video_agent')
    user_input_agent: UserInputAgent = agents.get('user_input_agent')

    if not video_agent or not user_input_agent:
        await socketio.emit('process-log', {'message': 'Agents not initialized.'}, room=session_id)
        return

    # Create SearchAgent
    search_agent = SearchAgent(socketio, session_id, form_requirements, video_agent)
    agents_dict[session_id]['search_agent'] = search_agent

    # Perform search
    first_result_url = await search_agent.perform_search()
    if not first_result_url:
        await video_agent.socketio.emit('process-log', {'message': 'No search result to proceed.'}, room=session_id)
        video_agent.stop_streaming()
        return

    # Navigate to the first result
    await video_agent.socketio.emit('process-log', {'message': f'Navigating to {first_result_url}'}, room=session_id)
    await asyncio.sleep(3)  # Delay for visibility

    # Continue with Playwright navigation
    # Reuse the existing Playwright instance from SearchAgent
    page = search_agent.page

    # Analyze the form fields using Gemini LLM
    await video_agent.socketio.emit('process-log', {'message': 'Analyzing form fields with Gemini LLM...'}, room=session_id)
    page_content = await page.content()

    # Gemini LLM Client Function
    def gemini_client(prompt, file_paths = []):
        # gemini_api_key = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))  # Securely load API key from environment
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
        f"User Input Data:\n{json.dumps(input_data)}\n\n"
        f"HTML Content:\n{page_content}"
    )

    lml_response = gemini_client(prompt)
    print(f"\n### LLM Response ###\n{lml_response}\n##\n")
    try:
        form_data = json.loads(lml_response)
        form_fields = form_data.get("fields", [])
        submit_button = form_data.get("submit_button", {})
        confirmation_strategies = form_data.get("confirmation_strategies", [])
        await video_agent.socketio.emit('process-log', {'message': 'Successfully extracted form fields, submit button, and confirmation strategies.'}, room=session_id)
        print(f"Form fields extracted for session {session_id}: {form_fields}")
        print(f"Submit button: {submit_button}")
        print(f"Confirmation strategies: {confirmation_strategies}")

        # Create FormFillingAgent
        form_filling_agent = FormFillingAgent(
            socketio,
            session_id,
            form_fields,
            confirmation_strategies,
            video_agent,
            user_input_agent
        )
        agents_dict[session_id]['form_filling_agent'] = form_filling_agent

    except json.JSONDecodeError:
        await video_agent.socketio.emit('process-log', {'message': 'Failed to parse Gemini LLM response.'}, room=session_id)
        print(f"Error parsing Gemini response for session {session_id}: {lml_response}")
        return

    # Start filling the form
    await form_filling_agent.fill_form(page, input_data)

    # Submit the form
    await form_filling_agent.submit_form(page)

    # Close all agents
    await search_agent.close_browser()
    video_agent.stop_streaming()

    # Remove agents from the dictionary
    del agents_dict[session_id]

    await video_agent.socketio.emit('process-log', {'message': 'Automation process completed.'}, room=session_id)

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
        user_input_agent: UserInputAgent = agents_dict[session_id].get('user_input_agent')
        if user_input_agent:
            user_input_agent.receive_user_input(user_input)
        else:
            print(f"No UserInputAgent found for session_id: {session_id}")
    else:
        print(f"No agent found for session_id: {session_id}")

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
