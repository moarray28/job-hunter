import httpx

from app.adapters.base import BaseAdapter
from app.config import settings
from app.models import JobPosting, ScrapeRequest

SERPAPI_URL = "https://serpapi.com/search"


class GoogleJobsAdapter(BaseAdapter):
    """Google Jobs via SerpAPI (needs SERPAPI_KEY). Aggregates LinkedIn, Indeed, career sites."""

    key = "google_jobs"
    display_name = "Google Jobs (SerpAPI)"
    note = "Requires SERPAPI_KEY on the scraper service. Free tier: 100 searches/month."

    def is_configured(self) -> bool:
        return bool(settings.serpapi_key)

    async def search(self, req: ScrapeRequest) -> list[JobPosting]:
        if not settings.serpapi_key:
            raise RuntimeError("SERPAPI_KEY is not set on the scraper service")

        params = {"engine": "google_jobs", "q": req.query, "api_key": settings.serpapi_key}
        if req.location:
            params["location"] = req.location

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(SERPAPI_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        if "error" in data and not data.get("jobs_results"):
            raise RuntimeError(f"SerpAPI: {data['error']}")

        postings: list[JobPosting] = []
        for r in data.get("jobs_results", []):
            apply_options = r.get("apply_options") or []
            url = apply_options[0].get("link") if apply_options else r.get("share_link")
            if not url:
                continue
            ext = r.get("detected_extensions") or {}
            postings.append(
                JobPosting(
                    title=r.get("title", "Untitled"),
                    company=r.get("company_name", "Unknown"),
                    location=r.get("location"),
                    url=url,
                    description=r.get("description"),
                    salary=ext.get("salary"),
                    posted_at=ext.get("posted_at"),
                )
            )
        return postings
