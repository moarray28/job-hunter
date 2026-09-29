from fastapi import APIRouter

from app.services.scraper_service import run_all_enabled_portals

router = APIRouter(prefix="/api/scrape", tags=["scrape"])


@router.post("/run-all")
async def run_all():
    return await run_all_enabled_portals()
