# agents/search_agent.py

import asyncio
import json
import time
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
from utils.gemini_client import gemini_client
from utils.logger import log_info, log_error

class SearchAgent:
    def __init__(self, requirements):
        self.requirements = requirements
        self.search_results = []

    async def search_websites(self):
        """
        Uses Playwright to open Google, perform search, and scrape result URLs.
        Returns a list of URLs.
        """
        try:
            log_info("SearchAgent: Starting browser automation for Google search.")
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=False)  # Headed for mimicking real user
                context = await browser.new_context(
                    viewport={"width": 1280, "height": 720},
                    user_agent=self.get_random_user_agent()
                )
                page = await context.new_page()
                await page.goto("https://www.google.com", timeout=60000)
                log_info("SearchAgent: Navigated to Google.")
                await asyncio.sleep(2)  # Wait for the page to load

                # Accept cookies if the prompt appears
                try:
                    await page.click('button:has-text("I agree")', timeout=5000)
                    log_info("SearchAgent: Accepted cookies.")
                    await asyncio.sleep(1)
                except PlaywrightTimeoutError:
                    log_info("SearchAgent: No cookies prompt detected.")

                # Perform search
                search_box_selector = 'input[name="q"]'
                await page.fill(search_box_selector, self.requirements)
                await page.press(search_box_selector, 'Enter')
                log_info(f"SearchAgent: Performed search for '{self.requirements}'.")
                await asyncio.sleep(3)  # Wait for search results to load

                # Scrape search result URLs
                self.search_results = await self.scrape_search_results(page)
                log_info(f"SearchAgent: Scraped {len(self.search_results)} search results.")

                await browser.close()
            return self.search_results

        except Exception as e:
            log_error(f"SearchAgent Error: {str(e)}")
            return []

    async def scrape_search_results(self, page):
        """
        Scrapes the search result URLs from the Google search results page.
        Returns a list of URLs.
        """
        try:
            results = await page.query_selector_all('div.g')
            urls = []
            for result in results:
                link = await result.query_selector('a')
                if link:
                    href = await link.get_attribute('href')
                    if href and href.startswith('http'):
                        urls.append(href)
                if len(urls) >= 5:  # Limit to top 5 results
                    break
            return urls
        except Exception as e:
            log_error(f"SearchAgent Scraping Error: {str(e)}")
            return []

    def get_random_user_agent(self):
        """
        Returns a random user agent string to mimic different browsers/devices.
        """
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
            " Chrome/85.0.4183.102 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)"
            " Version/14.0.3 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)"
            " Chrome/85.0.4183.121 Safari/537.36",
            # Add more user agents as needed
        ]
        import random
        return random.choice(user_agents)
