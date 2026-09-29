"use client";

import { useEffect, useState } from "react";
import { api, Application } from "@/lib/api";

const STATUSES = ["draft", "applied", "interviewing", "offer", "rejected", "withdrawn"];

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);

  async function load() {
    setApps(await api.applications.list());
  }

  useEffect(() => {
    load();
  }, []);

  async function update(id: string, payload: Partial<Application>) {
    await api.applications.update(id, payload);
    load();
  }

  async function remove(id: string) {
    await api.applications.remove(id);
    load();
  }

  const counts = STATUSES.map((s) => ({ s, n: apps.filter((a) => a.status === s).length }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Applications</h1>
      <div className="flex gap-4 mb-6 text-sm">
        {counts.map(({ s, n }) => (
          <span key={s} className="bg-slate-800 rounded px-3 py-1">
            {s}: <b>{n}</b>
          </span>
        ))}
      </div>
      {apps.length === 0 ? (
        <p className="text-slate-400">No applications yet. Mark a job as applied from the Jobs tab.</p>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-sm">
              <th className="py-2">Job</th>
              <th>Company</th>
              <th>Applied</th>
              <th>Resume version</th>
              <th>Status</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id} className="border-b border-slate-800 align-top">
                <td className="py-2">{a.job_title}</td>
                <td>{a.company}</td>
                <td className="text-sm">{new Date(a.applied_at).toLocaleDateString()}</td>
                <td>
                  <input
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm w-32"
                    defaultValue={a.resume_version || ""}
                    onBlur={(e) => update(a.id, { resume_version: e.target.value })}
                  />
                </td>
                <td>
                  <select
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    value={a.status}
                    onChange={(e) => update(a.id, { status: e.target.value })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <textarea
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm w-64"
                    rows={2}
                    defaultValue={a.notes || ""}
                    onBlur={(e) => update(a.id, { notes: e.target.value })}
                  />
                </td>
                <td>
                  <button className="text-sm text-red-400 hover:text-red-300" onClick={() => remove(a.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
