const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type JobStatus =
  | "new"
  | "reviewed"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "archived";

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  url: string;
  description?: string;
  salary?: string;
  posted_at?: string;
  source_portal: string;
  status: JobStatus;
  match_score?: number;
  experience_level?: string;
  min_years_experience?: number;
  is_remote?: boolean;
  industry?: string;
  scraped_at: string;
  notes?: string;
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

export interface Portal {
  id: string;
  name: string;
  adapter_type: string;
  enabled: boolean;
  query: string;
  location?: string;
  industry?: string;
  extra: Record<string, unknown>;
  last_run_at?: string;
  last_run_count?: number;
  last_error?: string;
}

export interface Application {
  id: string;
  job_id: string;
  job_title?: string;
  company?: string;
  resume_version?: string;
  cover_letter?: string;
  notes?: string;
  status: string;
  applied_at: string;
  updated_at: string;
}

export interface Profile {
  full_name?: string;
  target_titles: string[];
  skills: string[];
  locations: string[];
  resume_text?: string;
  min_salary?: number;
}

export const api = {
  jobs: {
    list: (params: URLSearchParams) => request<Job[]>(`/api/jobs?${params}`),
    filters: () => request<FilterDef[]>("/api/jobs/filters"),
    reprocess: () => request<{ updated: number }>("/api/jobs/reprocess", { method: "POST" }),
    updateStatus: (id: string, status: JobStatus) =>
      request<Job>(`/api/jobs/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    updateNotes: (id: string, notes: string) =>
      request<Job>(`/api/jobs/${id}/notes`, { method: "PATCH", body: JSON.stringify({ notes }) }),
    remove: (id: string) => request<void>(`/api/jobs/${id}`, { method: "DELETE" }),
  },
  portals: {
    list: () => request<Portal[]>("/api/portals"),
    adapterTypes: () => request<{ key: string; display_name: string }[]>("/api/portals/adapter-types"),
    attach: (payload: Partial<Portal>) =>
      request<Portal>("/api/portals", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<Portal>) =>
      request<Portal>(`/api/portals/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    detach: (id: string) => request<void>(`/api/portals/${id}`, { method: "DELETE" }),
    runNow: (id: string) => request<{ count: number; error: string | null }>(`/api/portals/${id}/run`, { method: "POST" }),
  },
  applications: {
    list: () => request<Application[]>("/api/applications"),
    create: (payload: { job_id: string; resume_version?: string; cover_letter?: string; notes?: string }) =>
      request<Application>("/api/applications", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: Partial<Application>) =>
      request<Application>(`/api/applications/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    remove: (id: string) => request<void>(`/api/applications/${id}`, { method: "DELETE" }),
  },
  profile: {
    get: () => request<Profile>("/api/profile"),
    update: (payload: Profile) => request<Profile>("/api/profile", { method: "PUT", body: JSON.stringify(payload) }),
  },
  scrape: {
    runAll: () => request<unknown[]>("/api/scrape/run-all", { method: "POST" }),
  },
};
