import type { Profile } from "../types";

/**
 * Keyword-overlap score in [0, 1]. Title matches count double.
 * Deliberately simple and transparent; swap for an embedding model in the
 * Python service if keyword matching stops being good enough.
 */
export function scoreJob(
  job: { title: string; description?: string | null },
  profile: Pick<Profile, "skills" | "target_titles">,
): number {
  const skills = profile.skills ?? [];
  const titles = profile.target_titles ?? [];
  if (!skills.length && !titles.length) return 0;

  const title = job.title.toLowerCase();
  const haystack = `${title} ${job.description ?? ""}`.toLowerCase();

  const skillHits = skills.filter((s) => haystack.includes(s.toLowerCase())).length;
  const titleHits = titles.filter((t) => title.includes(t.toLowerCase())).length;

  const raw = (skillHits + titleHits * 2) / (skills.length + titles.length * 2);
  return Math.round(Math.min(raw, 1) * 1000) / 1000;
}
