from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class ApplicationStatus(str, Enum):
    DRAFT = "draft"
    APPLIED = "applied"
    INTERVIEWING = "interviewing"
    OFFER = "offer"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class ApplicationCreate(BaseModel):
    job_id: str
    resume_version: Optional[str] = None
    cover_letter: Optional[str] = None
    notes: Optional[str] = None
    status: ApplicationStatus = ApplicationStatus.APPLIED


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    resume_version: Optional[str] = None
    cover_letter: Optional[str] = None
    notes: Optional[str] = None


class ApplicationOut(BaseModel):
    id: str
    job_id: str
    job_title: Optional[str] = None
    company: Optional[str] = None
    resume_version: Optional[str] = None
    cover_letter: Optional[str] = None
    notes: Optional[str] = None
    status: ApplicationStatus
    applied_at: datetime
    updated_at: datetime
