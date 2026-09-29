from datetime import datetime, timezone

from pymongo import UpdateOne
from pymongo.errors import DuplicateKeyError

from app.adapters.registry import get_adapter
from app.db import jobs_collection, portals_collection, profile_collection
from app.models.job import JobPosting, JobStatus
from app.models.portal import PortalConfig
from app.models.profile import Profile
from app.services.classifier import classify
from app.services.enricher import fill_descriptions
from app.services.matcher import score_job


async def _load_profile() -> Profile:
    profile_doc = await profile_collection.find_one({})
    return Profile(**profile_doc) if profile_doc else Profile()


async def run_portal(portal_doc: dict) -> dict:
    config = PortalConfig(**portal_doc)
    adapter = get_adapter(config.adapter_type)

    result = {"count": 0, "error": None}
    now = datetime.now(timezone.utc)

    try:
        postings = await adapter.search(config)
    except Exception as exc:  # adapter/network failures shouldn't crash the run loop
        result["error"] = str(exc)
        await portals_collection.update_one(
            {"_id": portal_doc["_id"]},
            {"$set": {"last_run_at": now, "last_error": result["error"], "last_run_count": 0}},
        )
        return result

    existing = {
        d["url"]
        async for d in jobs_collection.find(
            {"url": {"$in": [p.url for p in postings]}}, {"url": 1}
        )
    }
    postings = [p for p in postings if p.url not in existing]

    if config.extra.get("fetch_details", config.adapter_type == "generic_career"):
        await fill_descriptions(postings)

    profile = await _load_profile()

    inserted = 0
    for posting in postings:
        doc = posting.model_dump()
        doc["status"] = JobStatus.NEW.value
        doc["scraped_at"] = now
        doc["industry"] = config.industry
        doc["match_score"] = score_job(posting, profile)
        doc.update(classify(doc))
        try:
            await jobs_collection.insert_one(doc)
            inserted += 1
        except DuplicateKeyError:
            continue

    await portals_collection.update_one(
        {"_id": portal_doc["_id"]},
        {"$set": {"last_run_at": now, "last_error": None, "last_run_count": inserted}},
    )
    result["count"] = inserted
    return result


async def run_all_enabled_portals() -> list[dict]:
    results = []
    async for portal_doc in portals_collection.find({"enabled": True}):
        outcome = await run_portal(portal_doc)
        results.append({"portal": portal_doc["name"], **outcome})
    return results


async def reprocess_all_jobs() -> int:
    """Recompute match score and derived fields for every stored job."""
    profile = await _load_profile()
    ops = []
    async for doc in jobs_collection.find({}):
        posting = JobPosting(**{k: doc.get(k) for k in JobPosting.model_fields if k in doc})
        updates = {"match_score": score_job(posting, profile), **classify(doc)}
        ops.append(UpdateOne({"_id": doc["_id"]}, {"$set": updates}))
    if ops:
        await jobs_collection.bulk_write(ops)
    return len(ops)
