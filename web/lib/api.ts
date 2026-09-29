/** Browser-side client for the Next.js API routes (same origin). */
import type {
  AdapterInfo,
  Application,
  FilterDef,
  Job,
  JobStatus,
  Portal,
  Profile,
  RunResult,
} from "./types";

export * from "./types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  jobs: {
    list: (params: URLSearchParams) => request<Job[]>(`/api/jobs?${params}`),
    filters: () => request<FilterDef[]>("/api/jobs/filters"),
    update: (id: string, patch: { status?: JobStatus; notes?: string | null; industry?: string | null }) =>
      request<Job>(`/api/jobs/${id}`, json("PATCH", patch)),
    remove: (id: string) => request<void>(`/api/jobs/${id}`, { method: "DELETE" }),
    reprocess: () => request<{ updated: number }>("/api/jobs/reprocess", { method: "POST" }),
  },
  portals: {
    list: () => request<Portal[]>("/api/portals"),
    adapterTypes: () => request<AdapterInfo[]>("/api/portals/adapter-types"),
    attach: (payload: Partial<Portal>) => request<Portal>("/api/portals", json("POST", payload)),
    update: (id: string, payload: Partial<Portal>) => request<Portal>(`/api/portals/${id}`, json("PATCH", payload)),
    remove: (id: string) => request<void>(`/api/portals/${id}`, { method: "DELETE" }),
    runNow: (id: string) => request<RunResult>(`/api/portals/${id}/run`, { method: "POST" }),
  },
  applications: {
    list: () => request<Application[]>("/api/applications"),
    create: (payload: { job_id: string; resume_version?: string; cover_letter?: string; notes?: string }) =>
      request<Application>("/api/applications", json("POST", payload)),
    update: (id: string, payload: Partial<Application>) =>
      request<Application>(`/api/applications/${id}`, json("PATCH", payload)),
    remove: (id: string) => request<void>(`/api/applications/${id}`, { method: "DELETE" }),
  },
  profile: {
    get: () => request<Profile>("/api/profile"),
    update: (payload: Profile) => request<Profile>("/api/profile", json("PUT", payload)),
  },
  scrape: {
    runAll: () => request<RunResult[]>("/api/scrape/run-all", { method: "POST" }),
  },
};
