from app.adapters.base import BaseAdapter
from app.adapters.generic_career import GenericCareerAdapter
from app.adapters.google_jobs import GoogleJobsAdapter
from app.adapters.indeed import IndeedAdapter

ADAPTERS: dict[str, BaseAdapter] = {
    GenericCareerAdapter.key: GenericCareerAdapter(),
    IndeedAdapter.key: IndeedAdapter(),
    GoogleJobsAdapter.key: GoogleJobsAdapter(),
}


def get_adapter(adapter_type: str) -> BaseAdapter:
    adapter = ADAPTERS.get(adapter_type)
    if not adapter:
        raise ValueError(f"Unknown adapter_type '{adapter_type}'. Available: {list(ADAPTERS)}")
    return adapter


def list_adapter_types() -> list[dict]:
    return [{"key": a.key, "display_name": a.display_name} for a in ADAPTERS.values()]
