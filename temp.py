import asyncio
import requests
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright


def get_google_search_links(query):
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
    search_url = f"https://www.google.com/search?q={query}"
    response = requests.get(search_url, headers=headers)
    
    soup = BeautifulSoup(response.text, 'html.parser')
    print(soup.prettify())
    links = []
    
    for g in soup.find_all('div', class_='tF2Cxc'):
        link = g.find('a')['href']
        links.append(link)
    
    return links[:10]  # Return top 10 links


async def scrape_content(links):
    search_results = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        for link in links:
            try:
                page = await browser.new_page()
                await page.goto(link, timeout=10000)
                page_content = await page.content()
                parsed_content = BeautifulSoup(page_content, 'html.parser')
                text_content = parsed_content.get_text(separator=' ', strip=True)
                search_results.append({'url': link, 'content': text_content[:1000]})  # Limit content length
                await page.close()
            except Exception as e:
                print(f"Failed to scrape {link}: {e}")
        
        await browser.close()
    return search_results


# Run the function
query = "top AI venture capital firms 2024"
links = get_google_search_links(query)
print(links)
results = asyncio.run(scrape_content(links))

# Print results
for res in results:
    print(f"URL: {res['url']}")
    print(f"Content: {res['content'][:500]}...")
    print("-" * 80)
