from typing import Optional

from pydantic import BaseModel, Field


class JobPosting(BaseModel):
    """Normalized job shape every adapter must produce."""

    title: str
    company: str
    location: Optional[str] = None
    url: str
    description: Optional[str] = None
    salary: Optional[str] = None
    posted_at: Optional[str] = None


class ScrapeRequest(BaseModel):
    adapter_type: str
    query: str = ""
    location: Optional[str] = None
    extra: dict = {}


class ScrapeResponse(BaseModel):
    postings: list[JobPosting]


class EnrichRequest(BaseModel):
    urls: list[str] = Field(max_length=50)


class EnrichResponse(BaseModel):
    descriptions: dict[str, Optional[str]]


class AdapterField(BaseModel):
    key: str
    label: str
    required: bool = False
    placeholder: Optional[str] = None


class AdapterInfo(BaseModel):
    key: str
    display_name: str
    query_required: bool
    fields: list[AdapterField]
    configured: bool
    fetch_details_default: bool
    note: Optional[str] = None
