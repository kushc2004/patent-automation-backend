# Modify start_streaming() to use eventlet.spawn_n()
import eventlet

class VideoStreamingAgent:
    def __init__(self, socketio, session_id):
        self.socketio = socketio
        self.session_id = session_id
        self.screenshot_buffer = []
        self.buffer_lock = eventlet.semaphore.Semaphore()
        self.streaming_task = None

    def start_streaming(self):
        """Starts the screenshot streaming task using eventlet."""
        self.streaming_task = eventlet.spawn_n(self.stream_screenshots)

    def stop_streaming(self):
        """Stops the streaming task."""
        if self.streaming_task:
            eventlet.kill(self.streaming_task)
            self.streaming_task = None

    def stream_screenshots(self):
        """Streams screenshots using eventlet at ~30fps."""
        try:
            while True:
                with self.buffer_lock:
                    if self.screenshot_buffer:
                        screenshot = self.screenshot_buffer.pop(0)
                        self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
                eventlet.sleep(1/30)  # 30fps
        except eventlet.greenlet.GreenletExit:
            # Send remaining screenshots before exiting
            with self.buffer_lock:
                for screenshot in self.screenshot_buffer:
                    self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
                self.screenshot_buffer.clear()
