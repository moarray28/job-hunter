from typing import Literal

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query, Request
from pymongo import ReturnDocument

from app.db import jobs_collection
from app.filters import FILTERS, build_query
from app.models.job import JobNotesUpdate, JobOut, JobStatusUpdate
from app.services.scraper_service import reprocess_all_jobs

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

SORTS = {
    "newest": [("scraped_at", -1)],
    "match": [("match_score", -1), ("scraped_at", -1)],
}


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


def _oid(job_id: str) -> ObjectId:
    try:
        return ObjectId(job_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid job id")


@router.get("/filters")
async def list_filters():
    """Filter definitions for the UI, with select options resolved from current data."""
    out = []
    for f in FILTERS:
        options = f.options
        if f.options_field:
            options = sorted(v for v in await jobs_collection.distinct(f.options_field) if v)
        out.append(
            {"key": f.key, "label": f.label, "kind": f.kind, "options": options,
             "placeholder": f.placeholder}
        )
    return out


@router.get("", response_model=list[JobOut])
async def list_jobs(
    request: Request,
    sort: Literal["newest", "match"] = "newest",
    limit: int = Query(default=200, le=1000),
):
    params = {k: request.query_params.getlist(k) for k in request.query_params.keys()}
    query = build_query(params)
    cursor = jobs_collection.find(query).sort(SORTS[sort]).limit(limit)
    return [_serialize(doc) async for doc in cursor]


@router.post("/reprocess")
async def reprocess():
    return {"updated": await reprocess_all_jobs()}


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str):
    doc = await jobs_collection.find_one({"_id": _oid(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    return _serialize(doc)


@router.patch("/{job_id}/status", response_model=JobOut)
async def update_status(job_id: str, payload: JobStatusUpdate):
    result = await jobs_collection.find_one_and_update(
        {"_id": _oid(job_id)}, {"$set": {"status": payload.status.value}},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Job not found")
    return _serialize(result)


@router.patch("/{job_id}/notes", response_model=JobOut)
async def update_notes(job_id: str, payload: JobNotesUpdate):
    result = await jobs_collection.find_one_and_update(
        {"_id": _oid(job_id)}, {"$set": {"notes": payload.notes}},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Job not found")
    return _serialize(result)


@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: str):
    result = await jobs_collection.delete_one({"_id": _oid(job_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
