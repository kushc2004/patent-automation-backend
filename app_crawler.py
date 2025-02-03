# app.py
import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify
from flask_socketio import SocketIO, join_room, leave_room
from agent_crawler import SiteCrawlerAgent
from agents_old import AutomateSubmissionAgent
import uuid
from flask_cors import CORS

app = Flask(__name__)
app.config['SECRET_KEY'] = 'Legal.ai*2024'  # Replace with a strong secret key
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://legalai-frontend.onrender.com",
            "https://banthry.in",
            "https://www.banthry.in"
        ]
    }
})
# Initialize SocketIO with async_mode='asyncio'
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins="*")

agents = {}  # To keep track of active agents

import asyncio

@app.route('/api/crawl', methods=['POST'])
def start_crawl():
    data = request.json
    startUrl = data.get('startUrl')
    if not startUrl:
        return jsonify({'error': 'startUrl is required'}), 400

    session_id = str(uuid.uuid4())
    agent = SiteCrawlerAgent(socketio, session_id, startUrl)
    agents[session_id] = agent

    # Properly schedule the coroutine
    eventlet.spawn_n(asyncio.run, agent.run())

    return jsonify({'session_id': session_id})


@socketio.on('join')
def on_join(data):
    session_id = data.get('session_id')
    join_room(session_id)
    print(f"Client joined room: {session_id}")

@socketio.on('disconnect')
def on_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001)
