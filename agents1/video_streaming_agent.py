# agents/video_streaming_agent.py
import base64
from flask_socketio import SocketIO

class VideoStreamingAgent:
    def __init__(self, socketio: SocketIO, session_id: str):
        self.socketio = socketio
        self.session_id = session_id

    def send_screenshot(self, page):
        """Takes a screenshot, encodes it, and sends it to the frontend."""
        try:
            screenshot_bytes = page.screenshot()
            screenshot_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')
            self.socketio.emit('process-screenshot', {
                'description': 'Screenshot',
                'screenshot': screenshot_b64
            }, room=self.session_id)
        except Exception as e:
            print(f"Error taking screenshot: {e}")
            self.socketio.emit('process-log', {'message': f'Failed to take screenshot: {e}'}, room=self.session_id)
