"use client";

import { useCallback, useEffect, useState } from "react";
import FilterBar from "@/components/FilterBar";
import { ActiveFilter, api, FilterDef, Job, JobStatus } from "@/lib/api";

const STATUSES: JobStatus[] = [
  "new",
  "reviewed",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "archived",
];

const STORAGE_KEY = "jobHunter.filters";

function toParams(active: ActiveFilter[], sort: string): URLSearchParams {
  const params = new URLSearchParams({ sort });
  for (const f of active) for (const v of f.values) params.append(f.key, v);
  return params;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [defs, setDefs] = useState<FilterDef[]>([]);
  const [active, setActive] = useState<ActiveFilter[]>([]);
  const [sort, setSort] = useState("newest");
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.active) setActive(saved.active);
      if (saved?.sort) setSort(saved.sort);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
    api.jobs.filters().then(setDefs).catch((e) => setError((e as Error).message));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJobs(await api.jobs.list(toParams(active, sort)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [active, sort]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ active, sort }));
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [active, sort, hydrated, load]);

  async function handleStatusChange(id: string, status: JobStatus) {
    await api.jobs.updateStatus(id, status);
    load();
  }

  async function handleApply(job: Job) {
    await api.applications.create({ job_id: job.id });
    load();
  }

  async function handleScrapeAll() {
    setScraping(true);
    setError(null);
    try {
      await api.scrape.runAll();
      setDefs(await api.jobs.filters());
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScraping(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">
          Jobs <span className="text-base text-slate-400 font-normal">({jobs.length})</span>
        </h1>
        <div className="flex gap-3">
          <select
            className="bg-slate-800 border border-slate-600 rounded px-3 py-1"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="match">Best match first</option>
          </select>
          <button
            className="bg-blue-600 hover:bg-blue-500 rounded px-4 py-1 disabled:opacity-50"
            onClick={handleScrapeAll}
            disabled={scraping}
          >
            {scraping ? "Scraping..." : "Scrape all enabled portals"}
          </button>
        </div>
      </div>

      <div className="mb-5">
        <FilterBar defs={defs} active={active} onChange={setActive} />
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : jobs.length === 0 ? (
        <p className="text-slate-400">
          {active.length
            ? "No jobs match these filters."
            : "No jobs yet. Attach a portal and run a scrape from the Portals tab."}
        </p>
      ) : (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <div key={job.id} className="border border-slate-700 rounded-lg p-4 bg-slate-900">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-lg font-semibold text-blue-400 hover:underline"
                  >
                    {job.title}
                  </a>
                  <p className="text-slate-300">
                    {job.company} {job.location ? `· ${job.location}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    {job.experience_level && <Tag>{job.experience_level}</Tag>}
                    {job.min_years_experience != null && <Tag>{job.min_years_experience}+ yrs</Tag>}
                    {job.is_remote && <Tag>remote</Tag>}
                    {job.industry && <Tag>{job.industry}</Tag>}
                    {job.salary && <Tag>{job.salary}</Tag>}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    via {job.source_portal}
                    {job.match_score != null ? ` · match ${(job.match_score * 100).toFixed(0)}%` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <select
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    value={job.status}
                    onChange={(e) => handleStatusChange(job.id, e.target.value as JobStatus)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {(job.status === "new" || job.status === "reviewed") && (
                    <button
                      className="text-sm bg-green-700 hover:bg-green-600 rounded px-3 py-1"
                      onClick={() => handleApply(job)}
                    >
                      Mark applied
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5">{children}</span>;
}
