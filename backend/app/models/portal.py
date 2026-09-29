from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PortalConfig(BaseModel):
    name: str
    adapter_type: str  # matches key in adapters.registry
    enabled: bool = True
    query: str = ""
    location: Optional[str] = None
    industry: Optional[str] = None
    extra: dict = {}


class PortalOut(PortalConfig):
    id: str
    last_run_at: Optional[datetime] = None
    last_run_count: Optional[int] = None
    last_error: Optional[str] = None


class PortalCreate(PortalConfig):
    pass


class PortalUpdate(BaseModel):
    enabled: Optional[bool] = None
    query: Optional[str] = None
    location: Optional[str] = None
    industry: Optional[str] = None
    extra: Optional[dict] = None
