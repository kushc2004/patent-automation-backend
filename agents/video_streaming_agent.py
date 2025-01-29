# agents/video_streaming_agent.py
import asyncio
import base64
from flask_socketio import SocketIO
from playwright.async_api import Page
from typing import List, Dict

class VideoStreamingAgent:
    def __init__(self, socketio: SocketIO, session_id: str):
        self.socketio = socketio
        self.session_id = session_id
        self.screenshot_buffer: List[Dict[str, str]] = []
        self.buffer_lock = asyncio.Lock()
        self.streaming_task: asyncio.Task = None

    async def take_screenshot(self, page: Page, step_description: str):
        """Takes a screenshot and adds it to the buffer."""
        try:
            screenshot_bytes = await page.screenshot()
            screenshot_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')
            async with self.buffer_lock:
                self.screenshot_buffer.append({
                    'description': step_description,
                    'screenshot': screenshot_b64
                })
        except Exception as e:
            print(f"Error taking screenshot: {e}")

    async def stream_screenshots(self):
        """Streams screenshots from the buffer at ~30fps."""
        try:
            while True:
                async with self.buffer_lock:
                    if self.screenshot_buffer:
                        screenshot = self.screenshot_buffer.pop(0)
                        self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
                await asyncio.sleep(1/30)  # 30fps
        except asyncio.CancelledError:
            # Send any remaining screenshots
            async with self.buffer_lock:
                for screenshot in self.screenshot_buffer:
                    self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
                self.screenshot_buffer.clear()
            raise

    def start_streaming(self):
        """Starts the screenshot streaming task using SocketIO's background task."""
        self.streaming_task = self.socketio.start_background_task(self.run_stream_screenshots)

    async def run_stream_screenshots(self):
        """Wrapper to run the asynchronous stream_screenshots."""
        await self.stream_screenshots()

    def stop_streaming(self):
        """Stops the screenshot streaming task."""
        if self.streaming_task:
            self.streaming_task.cancel()
