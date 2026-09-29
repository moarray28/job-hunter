import type { ExperienceLevel } from "../types";

// Ordered most-specific first; the first pattern matching the title wins.
const EXPERIENCE_PATTERNS: [ExperienceLevel, RegExp][] = [
  ["internship", /\b(intern|internship|co-?op|trainee|apprentice)\b/i],
  ["executive", /\b(vp|vice president|director|head of|chief|cto|ceo|cfo)\b/i],
  ["principal", /\b(principal|staff|distinguished|architect)\b/i],
  ["lead", /\b(lead|manager|mgr)\b/i],
  ["senior", /\b(senior|sr\.?|iii|iv)\b/i],
  ["mid", /\b(mid|intermediate|ii)\b/i],
  ["entry", /\b(junior|jr\.?|entry|graduate|grad|new grad|associate|i)\b/i],
];

const YEARS_PATTERN = /(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|yrs?)/gi;
const REMOTE_PATTERN = /\b(remote|work from home|wfh|anywhere)\b/i;
const FULLY_REMOTE_PATTERN = /\bfully remote\b|\b100% remote\b/i;

export function inferMinYears(description?: string | null): number | null {
  if (!description) return null;
  const years = Array.from(description.matchAll(YEARS_PATTERN), (m) => Number(m[1])).filter(
    (y) => y <= 20,
  );
  return years.length ? Math.min(...years) : null;
}

export function inferExperienceLevel(title: string, description?: string | null): ExperienceLevel | null {
  for (const [level, pattern] of EXPERIENCE_PATTERNS) {
    if (pattern.test(title)) return level;
  }
  const years = inferMinYears(description);
  if (years === null) return null;
  if (years <= 1) return "entry";
  if (years <= 4) return "mid";
  if (years <= 7) return "senior";
  return "principal";
}

export function inferRemote(title: string, location?: string | null, description?: string | null): boolean {
  return REMOTE_PATTERN.test(`${title} ${location ?? ""}`) || FULLY_REMOTE_PATTERN.test(description ?? "");
}

export function classify(job: { title: string; location?: string | null; description?: string | null }) {
  return {
    experience_level: inferExperienceLevel(job.title, job.description),
    min_years_experience: inferMinYears(job.description),
    is_remote: inferRemote(job.title, job.location, job.description),
  };
}
