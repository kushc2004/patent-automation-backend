# app.py
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, join_room, leave_room
from agent_crawler import WebsiteCrawlerAgent
from agents_old import AutomateSubmissionAgent
import uuid
from flask_cors import CORS

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
# Initialize SocketIO with async_mode='asyncio'
socketio = SocketIO(app, async_mode='asyncio', cors_allowed_origins="*")

agents = {}  # To keep track of active agents

@app.route('/api/crawl', methods=['POST'])
def start_crawl():
    data = request.json
    home_url = data.get('home_url')
    if not home_url:
        return jsonify({'error': 'home_url is required'}), 400

    session_id = str(uuid.uuid4())
    agent = WebsiteCrawlerAgent(socketio, session_id, home_url)
    agents[session_id] = agent
    agent.start()

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
    socketio.run(app, host='0.0.0.0', port=5000)
