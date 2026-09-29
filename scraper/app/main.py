import hmac

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException

from app.adapters.registry import ADAPTERS, get_adapter
from app.config import settings
from app.enricher import fetch_descriptions
from app.models import AdapterInfo, EnrichRequest, EnrichResponse, ScrapeRequest, ScrapeResponse


def require_token(x_service_token: str = Header(default="")) -> None:
    if settings.service_token and not hmac.compare_digest(x_service_token, settings.service_token):
        raise HTTPException(status_code=401, detail="Invalid service token")


app = FastAPI(title="Job Hunter Scraper Service")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/adapters", response_model=list[AdapterInfo], dependencies=[Depends(require_token)])
async def list_adapters():
    return [a.info() for a in ADAPTERS.values()]


@app.post("/scrape", response_model=ScrapeResponse, dependencies=[Depends(require_token)])
async def scrape(req: ScrapeRequest):
    try:
        adapter = get_adapter(req.adapter_type)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        postings = await adapter.search(req)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"{adapter.display_name} returned HTTP {exc.response.status_code}",
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach source: {exc}")
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return ScrapeResponse(postings=postings)


@app.post("/enrich", response_model=EnrichResponse, dependencies=[Depends(require_token)])
async def enrich(req: EnrichRequest):
    return EnrichResponse(descriptions=await fetch_descriptions(req.urls))
