from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.adapters.base import BaseAdapter
from app.config import settings
from app.models.job import JobPosting
from app.models.portal import PortalConfig

JOB_LINK_HINTS = (
    "job", "career", "position", "opening", "req", "vacancy",
    "greenhouse.io", "lever.co", "myworkdayjobs", "smartrecruiters",
    "ashbyhq", "bamboohr", "workable",
)


class GenericCareerAdapter(BaseAdapter):
    """Best-effort scraper for an arbitrary company careers page.

    Config.extra must include {"careers_url": "https://..."}.
    Heuristic: any <a> whose href or text hints at a job posting is treated
    as a listing. Works well on most ATS-hosted careers pages; may need a
    per-company override for heavily custom sites.
    """

    key = "generic_career"
    display_name = "Generic Career Page"

    async def search(self, config: PortalConfig) -> list[JobPosting]:
        careers_url = config.extra.get("careers_url")
        if not careers_url:
            raise ValueError("generic_career adapter requires extra.careers_url")

        headers = {"User-Agent": settings.scrape_user_agent}
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=20) as client:
            resp = await client.get(careers_url)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        company = config.extra.get("company_name", _guess_company(careers_url))

        seen: set[str] = set()
        postings: list[JobPosting] = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            text = a.get_text(strip=True)
            if not text or len(text) < 3:
                continue
            haystack = f"{href} {text}".lower()
            if not any(hint in haystack for hint in JOB_LINK_HINTS):
                continue

            full_url = urljoin(careers_url, href)
            if full_url in seen:
                continue
            seen.add(full_url)

            if config.query and config.query.lower() not in text.lower():
                continue

            postings.append(
                JobPosting(
                    title=text,
                    company=company,
                    location=config.location,
                    url=full_url,
                    source_portal=config.name,
                )
            )

        return postings


def _guess_company(url: str) -> str:
    host = httpx.URL(url).host or ""
    parts = host.split(".")
    if len(parts) >= 2:
        return parts[-2].capitalize()
    return host
