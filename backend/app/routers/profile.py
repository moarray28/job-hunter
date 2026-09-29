from fastapi import APIRouter

from app.db import profile_collection
from app.models.profile import Profile
from app.services.scraper_service import reprocess_all_jobs

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=Profile)
async def get_profile():
    doc = await profile_collection.find_one({})
    return Profile(**doc) if doc else Profile()


@router.put("", response_model=Profile)
async def update_profile(payload: Profile):
    await profile_collection.update_one({}, {"$set": payload.model_dump()}, upsert=True)
    await reprocess_all_jobs()
    return payload
