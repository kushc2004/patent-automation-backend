# agents/search_agent.py
import asyncio
from playwright.async_api import async_playwright, Page
from typing import Optional
from flask_socketio import SocketIO
from agents.video_streaming_agent import VideoStreamingAgent

class SearchAgent:
    def __init__(self, socketio: SocketIO, session_id: str, search_query: str, video_agent: VideoStreamingAgent):
        self.socketio = socketio
        self.session_id = session_id
        self.search_query = search_query
        self.video_agent = video_agent
        self.playwright = None
        self.browser = None
        self.context = None
        self.page: Optional[Page] = None

    async def perform_search(self) -> Optional[str]:
        """Performs a Google search and returns the first result URL."""
        try:
            await self.socketio.emit('process-log', {'message': 'Performing Google search...'}, room=self.session_id)
            search_url = f"https://www.google.com/search?q={self.search_query}&sourceid=chrome&ie=UTF-8"
            await self.launch_browser(search_url)
            await asyncio.sleep(2)  # Wait for search results to load
            await self.video_agent.take_screenshot(self.page, 'Performed Google search.')
            first_result_url = await self.get_first_result_url()
            if first_result_url:
                await self.socketio.emit('process-log', {'message': f'First search result URL: {first_result_url}'}, room=self.session_id)
            else:
                await self.socketio.emit('process-log', {'message': 'No search results found.'}, room=self.session_id)
            return first_result_url
        except Exception as e:
            await self.socketio.emit('process-log', {'message': f'Error during search: {e}'}, room=self.session_id)
            return None

    async def launch_browser(self, url: str):
        """Launches Playwright browser and navigates to the given URL."""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=False)  # Set headless=False to see the browser
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()
        await self.page.goto(url)
        await self.video_agent.take_screenshot(self.page, 'Opened Google search URL.')

    async def get_first_result_url(self) -> Optional[str]:
        """Retrieves the URL of the first search result."""
        try:
            # Google search results are contained within <div class="g">
            await self.page.wait_for_selector('div.g', timeout=10000)  # Wait up to 10 seconds
            first_result = await self.page.query_selector('div.g a')
            if first_result:
                href = await first_result.get_attribute('href')
                return href
            else:
                return None
        except Exception as e:
            await self.socketio.emit('process-log', {'message': f'Error retrieving first result: {e}'}, room=self.session_id)
            return None

    async def close_browser(self):
        """Closes Playwright browser."""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
