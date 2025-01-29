# agents/user_input_agent.py
import eventlet
from flask_socketio import SocketIO

class UserInputAgent:
    def __init__(self, socketio: SocketIO, session_id: str):
        self.socketio = socketio
        self.session_id = session_id
        self.input_received = eventlet.event.Event()

    def prompt_user(self, prompt: str, input_type: str = 'text') -> dict:
        """Prompts the user for input and waits for the response."""
        self.socketio.emit('request-user-input', {'prompt': prompt, 'type': input_type}, room=self.session_id)
        self.input_received.wait()  # Wait for the user input
        response = self.input_received.get()
        return response

    def receive_user_input(self, data: dict):
        """Receives user input from the frontend and sets the event."""
        self.input_received.send(data)
