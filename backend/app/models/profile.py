from typing import Optional

from pydantic import BaseModel


class Profile(BaseModel):
    full_name: Optional[str] = None
    target_titles: list[str] = []
    skills: list[str] = []
    locations: list[str] = []
    resume_text: Optional[str] = None
    min_salary: Optional[int] = None
