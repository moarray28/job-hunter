import re
from typing import Optional

# Ordered most-specific first; the first pattern that matches the title wins.
EXPERIENCE_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("internship", re.compile(r"\b(intern|internship|co-?op|trainee|apprentice)\b", re.I)),
    ("executive", re.compile(r"\b(vp|vice president|director|head of|chief|cto|ceo|cfo)\b", re.I)),
    ("principal", re.compile(r"\b(principal|staff|distinguished|architect)\b", re.I)),
    ("lead", re.compile(r"\b(lead|manager|mgr)\b", re.I)),
    ("senior", re.compile(r"\b(senior|sr\.?|iii|iv)\b", re.I)),
    ("mid", re.compile(r"\b(mid|intermediate|ii)\b", re.I)),
    ("entry", re.compile(r"\b(junior|jr\.?|entry|graduate|grad|associate|new grad|i)\b", re.I)),
]

EXPERIENCE_LEVELS = [level for level, _ in EXPERIENCE_PATTERNS]

YEARS_PATTERN = re.compile(r"(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|yrs?)", re.I)
REMOTE_PATTERN = re.compile(r"\b(remote|work from home|wfh|anywhere)\b", re.I)


def infer_min_years(description: Optional[str]) -> Optional[int]:
    if not description:
        return None
    years = [int(m.group(1)) for m in YEARS_PATTERN.finditer(description)]
    years = [y for y in years if y <= 20]
    return min(years) if years else None


def infer_experience_level(title: str, description: Optional[str]) -> Optional[str]:
    for level, pattern in EXPERIENCE_PATTERNS:
        if pattern.search(title):
            return level

    years = infer_min_years(description)
    if years is None:
        return None
    if years <= 1:
        return "entry"
    if years <= 4:
        return "mid"
    if years <= 7:
        return "senior"
    return "principal"


def infer_remote(title: str, location: Optional[str], description: Optional[str]) -> bool:
    return bool(REMOTE_PATTERN.search(f"{title} {location or ''}")) or bool(
        description and re.search(r"\bfully remote\b|\b100% remote\b", description, re.I)
    )


def classify(doc: dict) -> dict:
    title = doc.get("title", "")
    description = doc.get("description")
    return {
        "experience_level": infer_experience_level(title, description),
        "min_years_experience": infer_min_years(description),
        "is_remote": infer_remote(title, doc.get("location"), description),
    }
