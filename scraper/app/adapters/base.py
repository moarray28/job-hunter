from abc import ABC, abstractmethod
from typing import Optional

from app.models import AdapterField, AdapterInfo, JobPosting, ScrapeRequest


class BaseAdapter(ABC):
    """Turns a ScrapeRequest into normalized JobPostings. Stateless; no DB access."""

    key: str
    display_name: str
    query_required: bool = True
    fields: list[AdapterField] = []
    fetch_details_default: bool = False
    note: Optional[str] = None

    def is_configured(self) -> bool:
        return True

    def info(self) -> AdapterInfo:
        return AdapterInfo(
            key=self.key,
            display_name=self.display_name,
            query_required=self.query_required,
            fields=self.fields,
            configured=self.is_configured(),
            fetch_details_default=self.fetch_details_default,
            note=self.note,
        )

    @abstractmethod
    async def search(self, req: ScrapeRequest) -> list[JobPosting]:
        ...
