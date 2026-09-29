from abc import ABC, abstractmethod

from app.models.job import JobPosting
from app.models.portal import PortalConfig


class BaseAdapter(ABC):
    """A portal adapter turns a PortalConfig into a list of normalized JobPosting.

    Attach/detach = enable/disable a PortalConfig row; the adapter itself is
    stateless and only runs when its owning portal is enabled.
    """

    key: str
    display_name: str

    @abstractmethod
    async def search(self, config: PortalConfig) -> list[JobPosting]:
        ...
