from app.adapters.base import BaseAdapter
from app.adapters.generic_career import GenericCareerAdapter
from app.adapters.google_jobs import GoogleJobsAdapter
from app.adapters.indeed import IndeedAdapter

ADAPTERS: dict[str, BaseAdapter] = {
    a.key: a for a in (GenericCareerAdapter(), GoogleJobsAdapter(), IndeedAdapter())
}


def get_adapter(adapter_type: str) -> BaseAdapter:
    adapter = ADAPTERS.get(adapter_type)
    if not adapter:
        raise KeyError(f"Unknown adapter '{adapter_type}'. Available: {list(ADAPTERS)}")
    return adapter
