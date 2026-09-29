from urllib.parse import urlencode

import httpx
from bs4 import BeautifulSoup

from app.adapters.base import BaseAdapter
from app.config import settings
from app.models.job import JobPosting
from app.models.portal import PortalConfig

BASE_URL = "https://www.indeed.com/jobs"


class IndeedAdapter(BaseAdapter):
    """Scrapes Indeed's public search results page (no login, no Easy Apply).

    Aggregation only: this never submits an application. Indeed's markup
    changes often, so selectors are kept loose (data-testid based) and this
    may need periodic updates.
    """

    key = "indeed"
    display_name = "Indeed"

    async def search(self, config: PortalConfig) -> list[JobPosting]:
        params = {"q": config.query}
        if config.location:
            params["l"] = config.location
        url = f"{BASE_URL}?{urlencode(params)}"

        headers = {"User-Agent": settings.scrape_user_agent}
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=20) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        postings: list[JobPosting] = []

        cards = soup.select("div.job_seen_beacon") or soup.select("[data-testid='slider_item']")
        for card in cards:
            title_el = card.select_one("h2.jobTitle a") or card.select_one("a[data-testid='job-title']")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            href = title_el.get("href", "")
            job_url = href if href.startswith("http") else f"https://www.indeed.com{href}"

            company_el = card.select_one("[data-testid='company-name']")
            location_el = card.select_one("[data-testid='text-location']")
            salary_el = card.select_one("[data-testid='attribute_snippet_testid']")

            postings.append(
                JobPosting(
                    title=title,
                    company=company_el.get_text(strip=True) if company_el else "Unknown",
                    location=location_el.get_text(strip=True) if location_el else config.location,
                    url=job_url,
                    salary=salary_el.get_text(strip=True) if salary_el else None,
                    source_portal=config.name,
                )
            )

        return postings
