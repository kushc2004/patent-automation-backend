# agents/search_agent.py
from playwright.sync_api import sync_playwright
from flask_socketio import SocketIO
from agents.video_streaming_agent import VideoStreamingAgent

class SearchAgent:
    def __init__(self, socketio: SocketIO, session_id: str, search_query: str, video_agent: VideoStreamingAgent):
        self.socketio = socketio
        self.session_id = session_id
        self.search_query = search_query
        self.video_agent = video_agent
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=False)  # Set headless=True for production
        self.context = self.browser.new_context()
        self.page = self.context.new_page()

    def perform_search(self) -> str:
        """Performs a Google search and returns the first result URL."""
        try:
            self.socketio.emit('process-log', {'message': 'Performing Google search...'}, room=self.session_id)
            search_url = f"https://www.google.com/search?q={self.search_query}"
            self.page.goto(search_url)
            self.video_agent.send_screenshot(self.page)
            # Get the first search result
            first_result = self.page.query_selector('div.g a')
            if first_result:
                href = first_result.get_attribute('href')
                self.socketio.emit('process-log', {'message': f'First search result URL: {href}'}, room=self.session_id)
                return href
            else:
                self.socketio.emit('process-log', {'message': 'No search results found.'}, room=self.session_id)
                return ""
        except Exception as e:
            self.socketio.emit('process-log', {'message': f'Error during search: {e}'}, room=self.session_id)
            return ""

    def close_browser(self):
        """Closes Playwright browser."""
        try:
            self.browser.close()
            self.playwright.stop()
        except Exception as e:
            print(f"Error closing browser: {e}")
