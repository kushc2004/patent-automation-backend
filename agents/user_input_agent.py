# agents/user_input_agent.py

import asyncio
from collections import defaultdict
from utils.logger import log_info, log_error

class UserInputAgent:
    """
    Handles user prompts for missing data or file uploads.
    """
    def __init__(self, socketio):
        self.socketio = socketio
        self.pending_requests = defaultdict(dict)  # {session_id: {field_name: asyncio.Future}}

    async def request_file_upload(self, session_id, field_name):
        """
        Sends a request to the frontend to upload a file for the specified field.
        Waits for the frontend to send the file path.
        """
        await self.emit_log(session_id, f"Field '{field_name}' requires a file upload.")
        # Create a future to wait for the file upload
        loop = asyncio.get_event_loop()
        future = loop.create_future()
        self.pending_requests[session_id][field_name] = future

        # Emit event to frontend to prompt for file upload
        self.socketio.emit('request-file-upload', {
            'session_id': session_id,
            'field_name': field_name,
            'message': f"Please upload a file for the field '{field_name}'."
        }, room=session_id)

        try:
            file_path = await asyncio.wait_for(future, timeout=300)  # Wait up to 5 minutes
            return file_path
        except asyncio.TimeoutError:
            await self.emit_log(session_id, f"File upload for '{field_name}' timed out.")
            log_error(f"UserInputAgent: File upload for '{field_name}' timed out.")
            return None

    def handle_file_upload(self, session_id, field_name, file_path):
        """
        Receives the file path from the frontend and resolves the pending request.
        """
        future = self.pending_requests.get(session_id, {}).get(field_name)
        if future and not future.done():
            future.set_result(file_path)
            del self.pending_requests[session_id][field_name]
            log_info(f"UserInputAgent: Received file upload for session {session_id}, field '{field_name}': {file_path}")
        else:
            log_error(f"UserInputAgent: No pending request for session {session_id}, field '{field_name}'.")

    async def emit_log(self, session_id, message):
        """Emits a log message to the session room."""
        self.socketio.emit('process-log', {'message': message}, room=session_id)

    async def wait_for_file_upload(self, session_id, field_name):
        """
        Waits for the frontend to provide the file path for the specified field.
        """
        future = self.pending_requests.get(session_id, {}).get(field_name)
        if future:
            return await future
        return None
