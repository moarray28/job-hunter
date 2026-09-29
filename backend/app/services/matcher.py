from app.models.job import JobPosting
from app.models.profile import Profile


def score_job(job: JobPosting, profile: Profile) -> float:
    """Simple keyword-overlap score in [0, 1]. Higher = better fit.

    Not ML-based on purpose: with one user and a small skills list, keyword
    overlap against title+description is transparent and good enough to
    rank a daily batch of scraped jobs.
    """
    if not profile.skills and not profile.target_titles:
        return 0.0

    haystack = f"{job.title} {job.description or ''}".lower()

    skill_hits = sum(1 for s in profile.skills if s.lower() in haystack)
    title_hits = sum(1 for t in profile.target_titles if t.lower() in job.title.lower())

    total_terms = len(profile.skills) + len(profile.target_titles)
    if total_terms == 0:
        return 0.0

    raw = (skill_hits + title_hits * 2) / (total_terms + len(profile.target_titles))
    return round(min(raw, 1.0), 3)
