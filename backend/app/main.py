from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import ensure_indexes
from app.routers import applications, jobs, portals, profile, scrape
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Job Hunter", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(portals.router)
app.include_router(applications.router)
app.include_router(profile.router)
app.include_router(scrape.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
