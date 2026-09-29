from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.adapters.registry import list_adapter_types
from app.db import portals_collection
from app.models.portal import PortalCreate, PortalOut, PortalUpdate
from app.services.scraper_service import run_portal

router = APIRouter(prefix="/api/portals", tags=["portals"])


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


def _oid(portal_id: str) -> ObjectId:
    try:
        return ObjectId(portal_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid portal id")


@router.get("/adapter-types")
async def get_adapter_types():
    return list_adapter_types()


@router.get("", response_model=list[PortalOut])
async def list_portals():
    return [_serialize(doc) async for doc in portals_collection.find({})]


@router.post("", response_model=PortalOut, status_code=201)
async def attach_portal(payload: PortalCreate):
    """'Attach' a job portal/source: create a config row for an adapter."""
    doc = payload.model_dump()
    try:
        result = await portals_collection.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="A portal with this name already exists")
    created = await portals_collection.find_one({"_id": result.inserted_id})
    return _serialize(created)


@router.patch("/{portal_id}", response_model=PortalOut)
async def update_portal(portal_id: str, payload: PortalUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await portals_collection.find_one_and_update(
        {"_id": _oid(portal_id)}, {"$set": updates}, return_document=ReturnDocument.AFTER
    )
    if not result:
        raise HTTPException(status_code=404, detail="Portal not found")
    return _serialize(result)


@router.delete("/{portal_id}", status_code=204)
async def detach_portal(portal_id: str):
    """'Detach' a portal: remove its config so it no longer runs."""
    result = await portals_collection.delete_one({"_id": _oid(portal_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Portal not found")


@router.post("/{portal_id}/run")
async def run_portal_now(portal_id: str):
    doc = await portals_collection.find_one({"_id": _oid(portal_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Portal not found")
    outcome = await run_portal(doc)
    if outcome["error"]:
        raise HTTPException(status_code=502, detail=outcome["error"])
    return outcome
