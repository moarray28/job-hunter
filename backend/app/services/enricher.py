import asyncio

import httpx
from bs4 import BeautifulSoup

from app.config import settings
from app.models.job import JobPosting

MAX_DETAIL_FETCHES = 25
CONCURRENCY = 5
MAX_DESCRIPTION_CHARS = 20000


def _extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "header", "footer", "noscript", "svg"]):
        tag.decompose()
    root = soup.find("main") or soup.find("article") or soup.body or soup
    text = " ".join(root.get_text(separator=" ").split())
    return text[:MAX_DESCRIPTION_CHARS]


async def fill_descriptions(postings: list[JobPosting]) -> None:
    """Fetch detail pages for postings missing a description (capped per run)."""
    targets = [p for p in postings if not p.description][:MAX_DETAIL_FETCHES]
    if not targets:
        return

    sem = asyncio.Semaphore(CONCURRENCY)
    headers = {"User-Agent": settings.scrape_user_agent}

    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=20) as client:

        async def fetch(posting: JobPosting) -> None:
            async with sem:
                try:
                    resp = await client.get(posting.url)
                    resp.raise_for_status()
                except httpx.HTTPError:
                    return
                posting.description = _extract_text(resp.text) or None

        await asyncio.gather(*(fetch(p) for p in targets))
