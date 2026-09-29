"use client";

import { useEffect, useState } from "react";
import { api, Portal } from "@/lib/api";

export default function PortalsPage() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [adapterTypes, setAdapterTypes] = useState<{ key: string; display_name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    adapter_type: "generic_career",
    query: "",
    location: "",
    industry: "",
    careers_url: "",
  });

  async function load() {
    setPortals(await api.portals.list());
    setAdapterTypes(await api.portals.adapterTypes());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAttach(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const extra = form.adapter_type === "generic_career" ? { careers_url: form.careers_url } : {};
      await api.portals.attach({
        name: form.name,
        adapter_type: form.adapter_type,
        query: form.query,
        location: form.location || undefined,
        industry: form.industry || undefined,
        enabled: true,
        extra,
      });
      setForm({ name: "", adapter_type: "generic_career", query: "", location: "", industry: "", careers_url: "" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function toggleEnabled(portal: Portal) {
    await api.portals.update(portal.id, { enabled: !portal.enabled });
    load();
  }

  async function detach(portal: Portal) {
    await api.portals.detach(portal.id);
    load();
  }

  async function runNow(portal: Portal) {
    setRunning(portal.id);
    setError(null);
    try {
      await api.portals.runNow(portal.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Portals</h1>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <div className="grid gap-3">
          {portals.map((portal) => (
            <div
              key={portal.id}
              className="border border-slate-700 rounded-lg p-4 bg-slate-900 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">
                  {portal.name}{" "}
                  <span className="text-xs text-slate-400">({portal.adapter_type})</span>
                </p>
                <p className="text-sm text-slate-400">
                  query: {portal.query || "(all)"} {portal.location ? `· ${portal.location}` : ""}
                  {portal.industry ? ` · ${portal.industry}` : ""}
                </p>
                <p className="text-xs text-slate-500">
                  last run: {portal.last_run_at ? new Date(portal.last_run_at).toLocaleString() : "never"}
                  {portal.last_run_count !== undefined ? ` · ${portal.last_run_count} jobs` : ""}
                  {portal.last_error ? ` · error: ${portal.last_error}` : ""}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  className="text-sm bg-slate-700 hover:bg-slate-600 rounded px-3 py-1"
                  onClick={() => toggleEnabled(portal)}
                >
                  {portal.enabled ? "Detach (disable)" : "Attach (enable)"}
                </button>
                <button
                  className="text-sm bg-blue-700 hover:bg-blue-600 rounded px-3 py-1 disabled:opacity-50"
                  onClick={() => runNow(portal)}
                  disabled={running === portal.id}
                >
                  {running === portal.id ? "Running..." : "Run now"}
                </button>
                <button
                  className="text-sm bg-red-800 hover:bg-red-700 rounded px-3 py-1"
                  onClick={() => detach(portal)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {portals.length === 0 && <p className="text-slate-400">No portals attached yet.</p>}
        </div>
      </div>

      <form onSubmit={handleAttach} className="border border-slate-700 rounded-lg p-4 bg-slate-900 grid gap-3">
        <h2 className="text-lg font-semibold">Attach a new portal</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="bg-slate-800 border border-slate-600 rounded px-3 py-2"
            placeholder="Name (e.g. Acme Careers)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <select
            className="bg-slate-800 border border-slate-600 rounded px-3 py-2"
            value={form.adapter_type}
            onChange={(e) => setForm({ ...form, adapter_type: e.target.value })}
          >
            {adapterTypes.map((a) => (
              <option key={a.key} value={a.key}>
                {a.display_name}
              </option>
            ))}
          </select>
          <input
            className="bg-slate-800 border border-slate-600 rounded px-3 py-2"
            placeholder={
              form.adapter_type === "generic_career"
                ? "Title filter (optional, blank = all listings)"
                : "Query / keyword (e.g. Software Engineer)"
            }
            value={form.query}
            onChange={(e) => setForm({ ...form, query: e.target.value })}
            required={form.adapter_type !== "generic_career"}
          />
          <input
            className="bg-slate-800 border border-slate-600 rounded px-3 py-2"
            placeholder="Location (optional)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <input
            className="bg-slate-800 border border-slate-600 rounded px-3 py-2"
            placeholder="Industry tag (optional, e.g. Fintech) - applied to all jobs from this portal"
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
          />
          {form.adapter_type === "generic_career" && (
            <input
              className="bg-slate-800 border border-slate-600 rounded px-3 py-2 col-span-2"
              placeholder="Careers page URL (e.g. https://company.com/careers)"
              value={form.careers_url}
              onChange={(e) => setForm({ ...form, careers_url: e.target.value })}
              required
            />
          )}
        </div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 w-fit">
          Attach portal
        </button>
      </form>
    </div>
  );
}
