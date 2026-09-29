from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.db import applications_collection, jobs_collection
from app.models.application import ApplicationCreate, ApplicationOut, ApplicationUpdate
from app.models.job import JobStatus

router = APIRouter(prefix="/api/applications", tags=["applications"])


def _oid(id_: str) -> ObjectId:
    try:
        return ObjectId(id_)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid id")


async def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    job = await jobs_collection.find_one({"_id": ObjectId(doc["job_id"])})
    doc["job_title"] = job["title"] if job else None
    doc["company"] = job["company"] if job else None
    return doc


@router.get("", response_model=list[ApplicationOut])
async def list_applications():
    return [await _serialize(doc) async for doc in applications_collection.find({}).sort("applied_at", -1)]


@router.post("", response_model=ApplicationOut, status_code=201)
async def create_application(payload: ApplicationCreate):
    job = await jobs_collection.find_one({"_id": _oid(payload.job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    now = datetime.now(timezone.utc)
    doc = payload.model_dump()
    doc["status"] = doc["status"].value if hasattr(doc["status"], "value") else doc["status"]
    doc["applied_at"] = now
    doc["updated_at"] = now

    try:
        result = await applications_collection.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An application for this job already exists")

    await jobs_collection.update_one(
        {"_id": _oid(payload.job_id)}, {"$set": {"status": JobStatus.APPLIED.value}}
    )

    created = await applications_collection.find_one({"_id": result.inserted_id})
    return await _serialize(created)


@router.patch("/{application_id}", response_model=ApplicationOut)
async def update_application(application_id: str, payload: ApplicationUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "status" in updates and hasattr(updates["status"], "value"):
        updates["status"] = updates["status"].value
    updates["updated_at"] = datetime.now(timezone.utc)

    result = await applications_collection.find_one_and_update(
        {"_id": _oid(application_id)}, {"$set": updates}, return_document=ReturnDocument.AFTER
    )
    if not result:
        raise HTTPException(status_code=404, detail="Application not found")

    if "status" in updates:
        job_status_map = {
            "interviewing": JobStatus.INTERVIEWING,
            "offer": JobStatus.OFFER,
            "rejected": JobStatus.REJECTED,
        }
        mapped = job_status_map.get(updates["status"])
        if mapped:
            await jobs_collection.update_one(
                {"_id": ObjectId(result["job_id"])}, {"$set": {"status": mapped.value}}
            )

    return await _serialize(result)


@router.delete("/{application_id}", status_code=204)
async def delete_application(application_id: str):
    result = await applications_collection.delete_one({"_id": _oid(application_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
