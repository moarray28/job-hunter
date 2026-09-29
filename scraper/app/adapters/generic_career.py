from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.adapters.base import BaseAdapter
from app.config import settings
from app.models import AdapterField, JobPosting, ScrapeRequest

JOB_LINK_HINTS = (
    "/job", "/jobs", "/career", "/position", "/opening", "/req", "/vacanc",
    "greenhouse.io", "lever.co", "myworkdayjobs", "smartrecruiters",
    "ashbyhq", "bamboohr", "workable",
)

# Link texts that are navigation, not postings.
NAV_TEXTS = {
    "careers", "jobs", "job openings", "open positions", "view all jobs", "see all jobs",
    "all jobs", "join us", "benefits", "life at", "search jobs", "apply", "apply now",
    "back", "next", "previous", "home", "learn more", "read more",
}


class GenericCareerAdapter(BaseAdapter):
    """Best-effort scraper for any company careers page.

    Treats links whose URL looks like a job posting as listings. Works well on
    ATS-hosted pages (Greenhouse, Lever, Ashby...) and many custom ones. Pages
    that render jobs purely with JavaScript will return nothing.
    """

    key = "generic_career"
    display_name = "Company Career Page"
    query_required = False
    fetch_details_default = True
    fields = [
        AdapterField(key="careers_url", label="Careers page URL", required=True,
                     placeholder="https://boards.greenhouse.io/company"),
        AdapterField(key="company_name", label="Company name (optional)",
                     placeholder="Defaults to the website's domain"),
    ]
    note = "Query is an optional title filter; blank keeps every listing."

    async def search(self, req: ScrapeRequest) -> list[JobPosting]:
        careers_url = req.extra.get("careers_url")
        if not careers_url:
            raise ValueError("careers_url is required")

        headers = {"User-Agent": settings.scrape_user_agent}
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=20) as client:
            resp = await client.get(careers_url)
            resp.raise_for_status()

        return parse_listings(resp.text, str(resp.url), req)


def parse_listings(html: str, page_url: str, req: ScrapeRequest) -> list[JobPosting]:
    soup = BeautifulSoup(html, "lxml")
    company = req.extra.get("company_name") or _guess_company(page_url)
    query = (req.query or "").strip().lower()

    seen: set[str] = set()
    postings: list[JobPosting] = []
    for a in soup.find_all("a", href=True):
        text = " ".join(a.get_text(" ", strip=True).split())
        if len(text) < 4 or len(text) > 150 or text.lower() in NAV_TEXTS:
            continue

        full_url = urljoin(page_url, a["href"]).split("#")[0]
        if full_url.rstrip("/") == page_url.rstrip("/") or not full_url.startswith("http"):
            continue
        if not any(hint in full_url.lower() for hint in JOB_LINK_HINTS):
            continue
        if full_url in seen:
            continue
        seen.add(full_url)

        if query and query not in text.lower():
            continue

        postings.append(
            JobPosting(title=text, company=company, location=req.location, url=full_url)
        )
    return postings


def _guess_company(url: str) -> str:
    parts = (urlparse(url).hostname or "").split(".")
    return parts[-2].capitalize() if len(parts) >= 2 else "Unknown"
