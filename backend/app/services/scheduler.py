from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.services.scraper_service import run_all_enabled_portals

scheduler = AsyncIOScheduler()


def start_scheduler() -> None:
    scheduler.add_job(
        run_all_enabled_portals,
        "interval",
        hours=6,
        id="scrape_enabled_portals",
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler() -> None:
    scheduler.shutdown(wait=False)
