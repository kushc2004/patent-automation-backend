# crawler_agent.py
import asyncio
import json
import base64
from playwright.async_api import async_playwright, Page
from flask_socketio import SocketIO
from typing import Dict, Any, List, Set, Optional
import re
from urllib.parse import urljoin, urlparse

class WebsiteCrawlerAgent:
    def __init__(self, socketio: SocketIO, session_id: str, home_url: str):
        self.socketio = socketio
        self.session_id = session_id
        self.home_url = home_url
        self.visited_urls: Set[str] = set()
        self.found_emails: Set[str] = set()
        self.found_contact_forms: Set[str] = set()
        self.found_application_forms: Set[str] = set()
        self.screenshot_buffer: List[Dict[str, str]] = []
        self.buffer_lock = asyncio.Lock()
        self.streaming_task: Optional[asyncio.Task] = None

    async def emit_log(self, message: str):
        """Emits a log message to the session room."""
        self.socketio.emit('process-log', {'message': message}, room=self.session_id)

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
            await self.emit_log(f"Screenshot taken: {step_description}")
        except Exception as e:
            await self.emit_log(f"Failed to take screenshot: {str(e)}")

    async def stream_screenshots(self):
        """Streams screenshots from the buffer at ~10fps."""
        try:
            while True:
                async with self.buffer_lock:
                    if self.screenshot_buffer:
                        screenshot = self.screenshot_buffer.pop(0)
                        self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
                await asyncio.sleep(0.1)  # 10fps
        except asyncio.CancelledError:
            # Send any remaining screenshots
            async with self.buffer_lock:
                for screenshot in self.screenshot_buffer:
                    self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
                self.screenshot_buffer.clear()
            raise

    async def crawl(self):
        """Main method to start crawling the website."""
        try:
            await self.emit_log('Starting website crawling process.')
            self.streaming_task = asyncio.create_task(self.stream_screenshots())

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context()
                page = await context.new_page()

                await self.visit_page(page, self.home_url, depth=0)

                await browser.close()

            await self.emit_log('Crawling process completed.')
            await self.emit_results()
        except Exception as e:
            await self.emit_log(f"Error during crawling: {str(e)}")
        finally:
            if self.streaming_task:
                self.streaming_task.cancel()
                try:
                    await self.streaming_task
                except asyncio.CancelledError:
                    pass

    async def visit_page(self, page: Page, url: str, depth: int):
        """Visits a page and searches for required elements."""
        if depth > 10:
            await self.emit_log('Maximum depth reached. Stopping crawl.')
            return
        if url in self.visited_urls:
            return
        self.visited_urls.add(url)

        await self.emit_log(f'Visiting: {url}')
        await page.goto(url, timeout=60000)  # 60 seconds timeout
        await self.take_screenshot(page, f'Visited {url}')
        content = await page.content()

        # Extract emails
        emails = set(re.findall(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", content))
        new_emails = emails - self.found_emails
        if new_emails:
            self.found_emails.update(new_emails)
            for email in new_emails:
                self.socketio.emit('found-email', {'email': email}, room=self.session_id)
                await self.emit_log(f"Found email: {email}")

        # Find 'Contact Us' form links
        contact_links = self.extract_links(page, content, ['contact', 'contact-us', 'get-in-touch'])
        for link in contact_links:
            full_link = urljoin(url, link)
            if full_link not in self.found_contact_forms:
                self.found_contact_forms.add(full_link)
                self.socketio.emit('found-contact-form', {'url': full_link}, room=self.session_id)
                await self.emit_log(f"Found Contact Us form link: {full_link}")

        # Find 'Application/Join Us' form links
        application_links = self.extract_links(page, content, ['apply', 'join-us', 'careers', 'employment'])
        for link in application_links:
            full_link = urljoin(url, link)
            if full_link not in self.found_application_forms:
                self.found_application_forms.add(full_link)
                self.socketio.emit('found-application-form', {'url': full_link}, room=self.session_id)
                await self.emit_log(f"Found Application/Join Us form link: {full_link}")

        # Find internal links to continue crawling
        internal_links = self.extract_internal_links(page, url)
        for link in internal_links:
            full_link = urljoin(url, link)
            if full_link not in self.visited_urls:
                await self.visit_page(page, full_link, depth + 1)
                if len(self.visited_urls) >= 10:
                    await self.emit_log('Reached maximum of 10 pages. Stopping crawl.')
                    return

    def extract_links(self, page: Page, content: str, keywords: List[str]) -> List[str]:
        """Extracts links that contain any of the specified keywords."""
        links = set()
        for keyword in keywords:
            pattern = re.compile(r'href=["\'](.*?)["\']', re.IGNORECASE)
            matches = pattern.findall(content)
            for match in matches:
                if keyword in match.lower():
                    links.add(match)
        return list(links)

    def extract_internal_links(self, page: Page, current_url: str) -> List[str]:
        """Extracts internal links from the current page."""
        internal_links = set()
        try:
            anchors = page.query_selector_all('a[href]')
            for anchor in anchors:
                href = anchor.get_attribute('href')
                if href:
                    parsed_href = urlparse(href)
                    parsed_current = urlparse(current_url)
                    if not parsed_href.netloc or parsed_href.netloc == parsed_current.netloc:
                        # Ensure the link is relative or same domain
                        cleaned_href = href.split('#')[0]  # Remove fragment
                        internal_links.add(cleaned_href)
        except Exception as e:
            asyncio.create_task(self.emit_log(f"Error extracting internal links: {str(e)}"))
        return list(internal_links)

    async def emit_results(self):
        """Emits the final results to the frontend."""
        results = {
            'emails': list(self.found_emails),
            'contact_forms': list(self.found_contact_forms),
            'application_forms': list(self.found_application_forms),
        }
        self.socketio.emit('crawl-results', results, room=self.session_id)
        await self.emit_log('Results emitted to frontend.')

    def start(self):
        """Starts the crawling process."""
        asyncio.create_task(self.crawl())
