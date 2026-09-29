import httpx

from app.adapters.base import BaseAdapter
from app.config import settings
from app.models.job import JobPosting
from app.models.portal import PortalConfig

SERPAPI_URL = "https://serpapi.com/search"


class GoogleJobsAdapter(BaseAdapter):
    """Uses SerpAPI's Google Jobs engine (requires SERPAPI_KEY env var).

    Google Jobs has no stable public HTML to scrape directly, so this relies
    on SerpAPI as the fetch layer. Without a key configured, search() raises
    so the caller can surface a clear "not configured" error instead of
    silently returning nothing.
    """

    key = "google_jobs"
    display_name = "Google Jobs"

    async def search(self, config: PortalConfig) -> list[JobPosting]:
        if not settings.serpapi_key:
            raise RuntimeError(
                "google_jobs adapter requires SERPAPI_KEY to be set in backend .env"
            )

        params = {
            "engine": "google_jobs",
            "q": config.query,
            "location": config.location or "",
            "api_key": settings.serpapi_key,
        }
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(SERPAPI_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        postings: list[JobPosting] = []
        for result in data.get("jobs_results", []):
            apply_options = result.get("apply_options") or []
            job_url = apply_options[0]["link"] if apply_options else result.get("share_link", "")
            if not job_url:
                continue
            postings.append(
                JobPosting(
                    title=result.get("title", "Untitled"),
                    company=result.get("company_name", "Unknown"),
                    location=result.get("location"),
                    url=job_url,
                    description=result.get("description"),
                    posted_at=(result.get("detected_extensions") or {}).get("posted_at"),
                    source_portal=config.name,
                )
            )

        return postings
