import asyncio
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from app.config import settings

CONCURRENCY = 5
MAX_DESCRIPTION_CHARS = 20000


def extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "header", "footer", "noscript", "svg", "form"]):
        tag.decompose()
    root = soup.find("main") or soup.find("article") or soup.body or soup
    return " ".join(root.get_text(separator=" ").split())[:MAX_DESCRIPTION_CHARS]


async def fetch_descriptions(urls: list[str]) -> dict[str, Optional[str]]:
    """Fetch each job detail page and return its main text (None on failure)."""
    sem = asyncio.Semaphore(CONCURRENCY)
    headers = {"User-Agent": settings.scrape_user_agent}
    results: dict[str, Optional[str]] = {}

    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=20) as client:

        async def fetch(url: str) -> None:
            async with sem:
                try:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    results[url] = extract_text(resp.text) or None
                except httpx.HTTPError:
                    results[url] = None

        await asyncio.gather(*(fetch(u) for u in dict.fromkeys(urls)))
    return results
