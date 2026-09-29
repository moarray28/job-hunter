export const JOB_STATUSES = [
  "new",
  "reviewed",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "archived",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const APPLICATION_STATUSES = [
  "draft",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const EXPERIENCE_LEVELS = [
  "internship",
  "entry",
  "mid",
  "senior",
  "lead",
  "principal",
  "executive",
] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/** Shape returned by the Python scraper service. */
export interface JobPosting {
  title: string;
  company: string;
  location?: string | null;
  url: string;
  description?: string | null;
  salary?: string | null;
  posted_at?: string | null;
}

export interface Job extends JobPosting {
  id: string;
  source_portal: string;
  status: JobStatus;
  match_score: number;
  experience_level: ExperienceLevel | null;
  min_years_experience: number | null;
  is_remote: boolean;
  industry: string | null;
  scraped_at: string;
  notes?: string | null;
}

export interface Portal {
  id: string;
  name: string;
  adapter_type: string;
  enabled: boolean;
  query: string;
  location?: string | null;
  industry?: string | null;
  extra: Record<string, string>;
  fetch_details?: boolean | null;
  last_run_at?: string | null;
  last_run_count?: number | null;
  last_error?: string | null;
}

export interface AdapterField {
  key: string;
  label: string;
  required: boolean;
  placeholder?: string | null;
}

export interface AdapterInfo {
  key: string;
  display_name: string;
  query_required: boolean;
  fields: AdapterField[];
  configured: boolean;
  fetch_details_default: boolean;
  note?: string | null;
}

export interface Application {
  id: string;
  job_id: string;
  job_title?: string | null;
  company?: string | null;
  job_url?: string | null;
  resume_version?: string | null;
  cover_letter?: string | null;
  notes?: string | null;
  status: ApplicationStatus;
  applied_at: string;
  updated_at: string;
}

export interface Profile {
  full_name?: string | null;
  target_titles: string[];
  skills: string[];
  locations: string[];
  resume_text?: string | null;
  min_salary?: number | null;
}

export type FilterKind = "text" | "multiselect" | "number" | "boolean";

export interface FilterDef {
  key: string;
  label: string;
  kind: FilterKind;
  options?: string[] | null;
  placeholder?: string | null;
}

export interface ActiveFilter {
  key: string;
  values: string[];
}

export interface RunResult {
  portal: string;
  count: number;
  error: string | null;
}
