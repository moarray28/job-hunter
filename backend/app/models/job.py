from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class JobStatus(str, Enum):
    NEW = "new"
    REVIEWED = "reviewed"
    APPLIED = "applied"
    INTERVIEWING = "interviewing"
    OFFER = "offer"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class JobPosting(BaseModel):
    """Normalized job shape every adapter must produce."""

    title: str
    company: str
    location: Optional[str] = None
    url: str
    description: Optional[str] = None
    salary: Optional[str] = None
    posted_at: Optional[str] = None
    source_portal: str


class JobOut(JobPosting):
    id: str
    status: JobStatus = JobStatus.NEW
    match_score: Optional[float] = None
    experience_level: Optional[str] = None
    min_years_experience: Optional[int] = None
    is_remote: Optional[bool] = None
    industry: Optional[str] = None
    scraped_at: datetime
    notes: Optional[str] = None


class JobStatusUpdate(BaseModel):
    status: JobStatus


class JobNotesUpdate(BaseModel):
    notes: str


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
