# agents/user_input_agent.py
import asyncio
from flask_socketio import SocketIO
from typing import Any, Dict

class UserInputAgent:
    def __init__(self, socketio: SocketIO, session_id: str):
        self.socketio = socketio
        self.session_id = session_id
        self.user_input_future: asyncio.Future = None

    async def prompt_user(self, prompt: str, input_type: str = 'text') -> Any:
        """Prompts the user for input and waits for the response."""
        self.user_input_future = asyncio.get_event_loop().create_future()
        self.socketio.emit('request-user-input', {'prompt': prompt, 'type': input_type}, room=self.session_id)
        user_input = await self.user_input_future
        return user_input

    def receive_user_input(self, data: Any):
        """Receives user input from the frontend and sets the future result."""
        if self.user_input_future and not self.user_input_future.done():
            self.user_input_future.set_result(data)
