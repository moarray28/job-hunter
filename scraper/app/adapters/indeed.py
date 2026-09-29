import httpx
from bs4 import BeautifulSoup

from app.adapters.base import BaseAdapter
from app.config import settings
from app.models import AdapterField, JobPosting, ScrapeRequest


class IndeedAdapter(BaseAdapter):
    """Reads Indeed's public search results page. Never logs in or applies.

    Indeed frequently serves bot challenges to scripted requests, so this may
    return an error; Google Jobs usually surfaces the same listings.
    """

    key = "indeed"
    display_name = "Indeed"
    fields = [
        AdapterField(key="domain", label="Indeed domain (optional)",
                     placeholder="www.indeed.com, in.indeed.com, uk.indeed.com"),
    ]
    note = "Indeed often blocks automated requests; prefer Google Jobs if this errors."

    async def search(self, req: ScrapeRequest) -> list[JobPosting]:
        domain = req.extra.get("domain") or "www.indeed.com"
        params = {"q": req.query}
        if req.location:
            params["l"] = req.location

        headers = {"User-Agent": settings.scrape_user_agent, "Accept-Language": "en-US,en;q=0.9"}
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=20) as client:
            resp = await client.get(f"https://{domain}/jobs", params=params)
            resp.raise_for_status()

        return parse_results(resp.text, domain, req)


def parse_results(html: str, domain: str, req: ScrapeRequest) -> list[JobPosting]:
    soup = BeautifulSoup(html, "lxml")
    postings: list[JobPosting] = []

    for card in soup.select("div.job_seen_beacon"):
        title_el = card.select_one("h2.jobTitle a") or card.select_one("a[data-jk]")
        if not title_el:
            continue
        href = title_el.get("href", "")
        company_el = card.select_one("[data-testid='company-name']")
        location_el = card.select_one("[data-testid='text-location']")
        salary_el = card.select_one("[data-testid='attribute_snippet_testid']")
        snippet_el = card.select_one("[data-testid='jobsnippet_footer']") or card.select_one(".job-snippet")

        postings.append(
            JobPosting(
                title=title_el.get_text(strip=True),
                company=company_el.get_text(strip=True) if company_el else "Unknown",
                location=location_el.get_text(strip=True) if location_el else req.location,
                url=href if href.startswith("http") else f"https://{domain}{href}",
                salary=salary_el.get_text(strip=True) if salary_el else None,
                description=snippet_el.get_text(" ", strip=True) if snippet_el else None,
            )
        )
    return postings
