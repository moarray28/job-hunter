"""Declarative job filters.

To add a new filter, append a FilterDef to FILTERS. The API builds the Mongo
query from it and the frontend renders the right input from its `kind`.
"""

import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable, Optional

from app.models.job import JobStatus
from app.services.classifier import EXPERIENCE_LEVELS

Builder = Callable[[list[str]], Optional[dict]]


@dataclass(frozen=True)
class FilterDef:
    key: str
    label: str
    kind: str  # "text" | "multiselect" | "number" | "boolean"
    build: Builder
    options: Optional[list[str]] = None
    options_field: Optional[str] = None  # load options from distinct DB values
    placeholder: Optional[str] = None


def _terms(values: list[str]) -> list[str]:
    return [t.strip() for v in values for t in v.split(",") if t.strip()]


def _rx(term: str) -> dict:
    return {"$regex": re.escape(term), "$options": "i"}


def any_term_in(*fields: str) -> Builder:
    def build(values: list[str]) -> Optional[dict]:
        terms = _terms(values)
        if not terms:
            return None
        return {"$or": [{f: _rx(t)} for f in fields for t in terms]}

    return build


def all_terms_in(*fields: str) -> Builder:
    def build(values: list[str]) -> Optional[dict]:
        terms = _terms(values)
        if not terms:
            return None
        return {"$and": [{"$or": [{f: _rx(t)} for f in fields]} for t in terms]}

    return build


def no_term_in(*fields: str) -> Builder:
    def build(values: list[str]) -> Optional[dict]:
        terms = _terms(values)
        if not terms:
            return None
        return {"$nor": [{f: _rx(t)} for f in fields for t in terms]}

    return build


def one_of(field: str) -> Builder:
    def build(values: list[str]) -> Optional[dict]:
        terms = _terms(values)
        return {field: {"$in": terms}} if terms else None

    return build


def is_true(field: str) -> Builder:
    def build(values: list[str]) -> Optional[dict]:
        return {field: True} if values and values[-1].lower() == "true" else None

    return build


def _number(values: list[str]) -> Optional[float]:
    try:
        return float(values[-1]) if values and values[-1] != "" else None
    except ValueError:
        return None


def max_years(values: list[str]) -> Optional[dict]:
    n = _number(values)
    if n is None:
        return None
    # Jobs with no detectable years requirement are kept rather than hidden.
    return {"$or": [{"min_years_experience": {"$lte": n}}, {"min_years_experience": None}]}


def min_match_percent(values: list[str]) -> Optional[dict]:
    n = _number(values)
    return {"match_score": {"$gte": n / 100}} if n is not None else None


def scraped_within_days(values: list[str]) -> Optional[dict]:
    n = _number(values)
    if n is None:
        return None
    return {"scraped_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=n)}}


FILTERS: list[FilterDef] = [
    FilterDef("role", "Role / title", "text", any_term_in("title"),
              placeholder="e.g. backend, data engineer (comma = any)"),
    FilterDef("location", "Location", "text", any_term_in("location"),
              placeholder="e.g. Bangalore, Remote (comma = any)"),
    FilterDef("remote", "Remote only", "boolean", is_true("is_remote")),
    FilterDef("experience_level", "Experience level", "multiselect",
              one_of("experience_level"), options=EXPERIENCE_LEVELS),
    FilterDef("max_years", "Max years required", "number", max_years, placeholder="e.g. 5"),
    FilterDef("industry", "Industry", "multiselect", one_of("industry"), options_field="industry"),
    FilterDef("company", "Company", "text", any_term_in("company"), placeholder="comma = any"),
    FilterDef("jd", "JD contains (all)", "text", all_terms_in("title", "description"),
              placeholder="e.g. python, aws (comma = all required)"),
    FilterDef("exclude", "Exclude keywords", "text", no_term_in("title", "description"),
              placeholder="e.g. clearance, unpaid"),
    FilterDef("status", "Status", "multiselect", one_of("status"),
              options=[s.value for s in JobStatus]),
    FilterDef("source_portal", "Source portal", "multiselect", one_of("source_portal"),
              options_field="source_portal"),
    FilterDef("min_score", "Min match %", "number", min_match_percent, placeholder="0-100"),
    FilterDef("scraped_within_days", "Found in last N days", "number", scraped_within_days,
              placeholder="e.g. 7"),
]

FILTERS_BY_KEY = {f.key: f for f in FILTERS}


def build_query(params: dict[str, list[str]]) -> dict:
    clauses = []
    for key, values in params.items():
        f = FILTERS_BY_KEY.get(key)
        if not f:
            continue
        clause = f.build(values)
        if clause:
            clauses.append(clause)
    return {"$and": clauses} if clauses else {}
