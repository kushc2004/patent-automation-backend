#!/usr/bin/env python
import eventlet
eventlet.monkey_patch()

import asyncio
import re
import json
import base64
from typing import Dict, Any, List, Set
from urllib.parse import urljoin, urlparse

import google.generativeai as genai
from flask_socketio import SocketIO
from playwright.async_api import async_playwright, Page

# --------------------------------------------------
# SiteCrawlerAgent
# --------------------------------------------------
class SiteCrawlerAgent:
    def __init__(self, socketio: SocketIO, session_id: str, start_url: str):
        self.socketio = socketio
        self.session_id = session_id
        self.start_url = start_url
        self.max_pages = 10
        self.screenshot_buffer: List[Dict[str, str]] = []
        self.buffer_lock = asyncio.Lock()
        self.streaming_task: asyncio.Task = None
        self.periodic_screenshot_task: asyncio.Task = None
        self.all_candidate_links: List[Dict[str, str]] = []

        # Collected results
        self.emails: Set[str] = set()
        self.contact_links: Set[str] = set()
        self.join_links: Set[str] = set()

    def configure_genai(self):
        """Configure the Gemini LLM client."""
        genai.configure(api_key="AIzaSyBa2Boeqwb-nTZ_6IZxesRbawOBasBQr1E")  # Replace with your actual API key
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",
            generation_config={
                "temperature": 0.2,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 8192,
                "response_mime_type": "application/json",
            }
        )
    def configure_genai_pro(self):
        """Configure the Gemini LLM client."""
        genai.configure(api_key="AIzaSyBa2Boeqwb-nTZ_6IZxesRbawOBasBQr1E")  # Replace with your actual API key
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-pro",
            generation_config={
                "temperature": 0.2,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 8192,
                "response_mime_type": "application/json",
            }
        )

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
        """Streams screenshots from the buffer at ~30fps."""
        try:
            while True:
                async with self.buffer_lock:
                    if self.screenshot_buffer:
                        screenshot = self.screenshot_buffer.pop(0)
                        self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
                await asyncio.sleep(1/30)
        except asyncio.CancelledError:
            async with self.buffer_lock:
                for screenshot in self.screenshot_buffer:
                    self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
                self.screenshot_buffer.clear()
            raise

    async def take_periodic_screenshots(self, page: Page):
        """Takes screenshots every second while the page is active."""
        try:
            while True:
                await self.take_screenshot(page, "Continuous capture")
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            await self.emit_log(f"Periodic screenshot error: {str(e)}")

    def gemini_client(self, prompt: str, file_paths: List[str] = []) -> str:
        """Generates content using Gemini LLM."""
        if file_paths:
            uploaded_files = [genai.upload_file(file) for file in file_paths]
            response = self.model.generate_content([prompt] + uploaded_files)
        else:
            response = self.model.generate_content(prompt)
        return response.text

    def create_navigation_prompt(self, current_url: str, page_body: str, links: List[Dict[str, str]]) -> str:
        """
        Creates a structured prompt for Gemini LLM.
        The prompt instructs the model to decide what navigation action to take next.
        """
        prompt = (
            "You are analyzing a webpage to extract relevant navigation actions. "
            "Your task is to find **email addresses, contact forms, join/application forms, and onboarding links.**\n\n"
            "You are provided with:\n"
            "- The **current URL**\n"
            "- **Extracted candidate links** (each with URL, anchor text, context, and one-line description)\n"
            "- The **text content of the page body** (excluding JavaScript and other non-content elements)\n\n"
            "**Important Guidelines:**\n"
            "1. Prioritize links inside divs or buttons related to onboarding, applications, hiring, or partnerships.\n"
            "2. If the page is a Contact Us page, look for additional links to external forms (e.g., Google Forms, Typeform).\n"
            "3. Do not stop if you reach a 'Contact Us' page; instead, analyze if the page contains form links and navigate to them.\n"
            "4. Consider navigation context: if a section mentions 'Tell us about your company', 'Become a partner', or 'Employment opportunities', prefer those links.\n"
            "5. If multiple links match, prioritize the most relevant one.\n"
            "6. If no useful links exist, return to the homepage.\n\n"
            "Provide the output in the following **JSON format**:\n\n"
            "```json\n"
            "{\n"
            "  \"action\": \"click\", \n"
            "  \"link\": \"https://typeform.com/application\", \n"
            "  \"reason\": \"The page contains a section titled 'Tell us about your company' with a link to a Typeform application.\"\n"
            "}\n"
            "```\n\n"
            f"**Current URL:** {current_url}\n\n"
            "**Extracted candidate links (with URL, anchor text, context, and description):**\n"
            f"{json.dumps(links, indent=2)}\n\n"
            "**Page Body Text (truncated):**\n"
            f"{page_body[:10000]}\n\n"
            "Decide the best next action based on the provided structure."
        )
        return prompt

    def decide_next_action(self, current_url: str, page_body: str, links: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Calls Gemini LLM with a structured prompt to decide what to do next.
        Returns a dict with keys:
          - action: one of "click", "back", or "stop"
          - link: if action is "click", the URL to follow (optional)
          - reason: explanation text
        """
        prompt = self.create_navigation_prompt(current_url, page_body, links)
        lml_response = self.gemini_client(prompt)
        try:
            decision = json.loads(lml_response)
            return decision
        except json.JSONDecodeError:
            # Fallback: choose first link that contains a keyword
            for item in links:
                if re.search(r"contact|join|apply", item.get("text", "").lower()):
                    return {"action": "click", "link": item["url"], "reason": "Default fallback on keyword."}
            return {"action": "back", "link": self.start_url, "reason": "No suitable link found; returning to homepage."}

    def get_link_descriptions(self, current_url: str, links: List[Dict[str, str]], page_body: str) -> List[Dict[str, str]]:
        """
        For each candidate link, uses Gemini LLM to generate a concise one-line description.
        The prompt now includes both the anchor text and a 'context' field (extracted from the nearest parent div
        and/or nearby header elements) so that the description is based on the entire container.
        Returns the list of links updated with an additional 'description' field.
        """
        prompt = (
            "You are given a list of candidate links from a webpage. Each link object has the keys 'url', 'text', and 'description'.\n"
            "The 'text' is the title/heading of the link (it might be in any parent div of the <a> tag also), and 'description' is the text from any of its parent containers. "
            "If the anchor text is generic (like 'continue', 'click', 'read more', etc.), you should use the additional context (analyse the page body again) provided to infer a proper description.\n"
            "Using the provided context, generate a concise one-line description that summarizes what the link likely points to.\n\n"
            "For example:\n"
            "```\n"
            '[{"url": "https://example.com/contact", "description": "Contact us page with support details."}, {"url": "https://example.com/apply", "description": "Founders application form."}]\n'
            "```\n\n"
            "Content details:\n"
            f"Current URL: {current_url}\n\n"
            f"Candidate links: {json.dumps(links, indent=2)}\n\n"
            "**Page Body Text (truncated):**\n"
            f"{page_body}\n\n"
            "Provide your answer in JSON format."
        )
        result = self.gemini_client(prompt)
        try:
            descriptions = json.loads(result)
            # Create mapping from URL to description
            desc_map = {item["url"]: item["description"] for item in descriptions if "url" in item and "description" in item}
            for link in links:
                link["description"] = desc_map.get(link["url"], "No description available")
            return links
        except Exception as e:
            for link in links:
                link["description"] = "No description available"
            return links

    async def crawl_site(self):
        """Crawls the site and uses Gemini LLM to decide navigation actions."""
        await self.emit_log("Starting site crawl...")
        pages_visited = 0
        visited_urls = set()
        to_visit = [self.start_url]
        parsed_start = urlparse(self.start_url)
        domain = parsed_start.netloc

        # Configure Gemini LLM once at the start
        self.configure_genai()
        #self.configure_genai_pro()

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()

            # Start streaming screenshots
            self.streaming_task = asyncio.create_task(self.stream_screenshots())
            self.periodic_screenshot_task = asyncio.create_task(self.take_periodic_screenshots(page))

            while to_visit and pages_visited < self.max_pages:
                current_url = to_visit.pop(0)
                if current_url in visited_urls:
                    continue
                visited_urls.add(current_url)
                pages_visited += 1
                await self.emit_log(f"Crawling [{pages_visited}/{self.max_pages}]: {current_url}")

                try:
                    await page.goto(current_url, timeout=15000)
                    await asyncio.sleep(1)
                    await self.take_screenshot(page, f"Loaded page: {current_url}")
                except Exception as e:
                    await self.emit_log(f"Error loading {current_url}: {str(e)}")
                    continue

                # Get full HTML content if needed (for decision making)...
                try:
                    page_content = await page.content()
                except Exception as e:
                    await self.emit_log(f"Error getting content from {current_url}: {str(e)}")
                    continue

                # Extract only the text content of the page body (excluding JS/CSS)
                try:
                    page_body = await page.evaluate("() => document.body.innerText")
                except Exception as e:
                    page_body = page_content  # Fallback if evaluation fails

                # Search for email addresses in the page
                new_emails = set(re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", page_content))
                if new_emails:
                    self.emails.update(new_emails)
                    await self.emit_log(f"Found emails: {', '.join(new_emails)}")

                # Gather all candidate links (including external form links)
                candidate_links = []
                form_links = []  # For potential form links

                try:
                    anchors = await page.query_selector_all("a")
                    for anchor in anchors:
                        try:
                            href = await anchor.get_attribute("href")
                            anchor_text = (await anchor.inner_text()).strip() or ""
                            
                            # Get basic context from the nearest parent <div>
                            context_text = await page.evaluate(
                                """(element) => {
                                    let parent = element.parentElement;
                                    while (parent) {
                                        if (parent.tagName && parent.tagName.toLowerCase() === "div") {
                                            return parent.innerText;
                                        }
                                        parent = parent.parentElement;
                                    }
                                    return "";
                                }""", anchor)
                            
                            # If the anchor text is generic, try to extract header information
                            generic_texts = {"continue", "click", "read more", "learn more"}
                            if anchor_text.lower() in generic_texts:
                                heading_text = await page.evaluate(
                                    """(element) => {
                                        let parent = element.parentElement;
                                        while (parent) {
                                            // Look for header tags within the parent element
                                            let headers = parent.querySelectorAll("h1, h2, h3, h4, h5, h6");
                                            if (headers.length > 0) {
                                                return Array.from(headers).map(h => h.innerText).join(" ");
                                            }
                                            parent = parent.parentElement;
                                        }
                                        return "";
                                    }""", anchor)
                                if heading_text:
                                    # Prepend the heading text to the context for a richer description.
                                    context_text = heading_text + " " + context_text
                            
                            if href:
                                absolute_url = urljoin(current_url, href)
                                candidate_links.append({
                                    "url": absolute_url,
                                    "text": anchor_text,
                                    "context": context_text.strip() if context_text else ""
                                })
                                # Detect external form-related links
                                if re.search(r"typeform|google.com/forms|jotform|hubspot|airtable", absolute_url.lower()):
                                    form_links.append({
                                        "url": absolute_url,
                                        "text": anchor_text,
                                        "context": context_text.strip() if context_text else ""
                                    })
                                    self.contact_links.add(absolute_url)
                                # Detect form-related text patterns
                                if re.search(r"apply|join|form|sign[- ]?up|register|partner", anchor_text.lower()):
                                    form_links.append({
                                        "url": absolute_url,
                                        "text": anchor_text,
                                        "context": context_text.strip() if context_text else ""
                                    })
                                    self.contact_links.add(absolute_url)
                        except Exception as e:
                            await self.emit_log(f"Error processing an anchor on {current_url}: {str(e)}")
                    if form_links:
                        candidate_links = form_links + candidate_links
                except Exception as e:
                    await self.emit_log(f"Error processing anchors on {current_url}: {str(e)}")
                    continue

                # Generate one-line descriptions using only the page body text (excludes JS/CSS)
                await self.emit_log("Generating one-line descriptions for candidate links.")
                await self.emit_log(f"\nPage Body: {page_body}\n")
                
                described_links = self.get_link_descriptions(current_url, candidate_links, page_body)
                self.all_candidate_links.extend(described_links)

                # Use the page body text (rather than full HTML) in the decision prompt
                decision = self.decide_next_action(current_url, page_body, candidate_links)
                await self.emit_log(f"Gemini decision: {decision}")
                action = decision.get("action", "back")
                chosen_link = decision.get("link", self.start_url)

                if action == "click":
                    if chosen_link not in visited_urls:
                        to_visit.append(chosen_link)
                    else:
                        to_visit.append(self.start_url)
                elif action == "back":
                    to_visit.append(self.start_url)
                elif action == "stop":
                    await self.emit_log("Gemini instructed to stop crawling.")
                    break
                else:
                    to_visit.append(self.start_url)

                await asyncio.sleep(2)

            await self.emit_log("Crawl completed.")
            results = {
                "emails": list(self.emails),
                "contact_links": list(self.contact_links),
                "join_links": list(self.join_links),
                "pages_crawled": pages_visited,
                "candidate_links": self.all_candidate_links
            }
            self.socketio.emit('crawl-results', results, room=self.session_id)
            await browser.close()

        if self.streaming_task:
            self.streaming_task.cancel()
        if self.periodic_screenshot_task:
            self.periodic_screenshot_task.cancel()

    async def send_complete_video(self):
        """Sends all buffered screenshots as a video after completion."""
        async with self.buffer_lock:
            for screenshot in self.screenshot_buffer:
                self.socketio.emit('process-screenshot', screenshot, room=self.session_id)
            self.screenshot_buffer.clear()

    async def run(self):
        """Main entry to run the site crawler."""
        try:
            await self.crawl_site()
        except Exception as e:
            await self.emit_log(f"Error in crawl_site: {str(e)}")
        finally:
            await self.emit_log("Site crawling process completed.")
            if self.streaming_task:
                self.streaming_task.cancel()
            if self.periodic_screenshot_task:
                self.periodic_screenshot_task.cancel()
            await self.send_complete_video()
