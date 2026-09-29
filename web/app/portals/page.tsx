"use client";

import { useEffect, useState } from "react";
import { AdapterInfo, api, Portal } from "@/lib/api";

const input = "bg-slate-800 border border-slate-600 rounded px-3 py-2";

const emptyForm = { name: "", query: "", location: "", industry: "", extra: {} as Record<string, string> };

export default function PortalsPage() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  const [adapterError, setAdapterError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [adapterKey, setAdapterKey] = useState("");
  const [form, setForm] = useState(emptyForm);

  const adapter = adapters.find((a) => a.key === adapterKey);

  async function loadPortals() {
    try {
      setPortals(await api.portals.list());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    loadPortals();
    api.portals
      .adapterTypes()
      .then((list) => {
        setAdapters(list);
        setAdapterKey((k) => k || list[0]?.key || "");
      })
      .catch((e) => setAdapterError((e as Error).message));
  }, []);

  async function handleAttach(e: React.FormEvent) {
    e.preventDefault();
    if (!adapter) return;
    setError(null);
    try {
      const extra = Object.fromEntries(
        adapter.fields.map((f) => [f.key, form.extra[f.key]?.trim() ?? ""]).filter(([, v]) => v),
      );
      await api.portals.attach({
        name: form.name,
        adapter_type: adapter.key,
        query: form.query,
        location: form.location || null,
        industry: form.industry || null,
        enabled: true,
        extra,
      });
      setForm(emptyForm);
      loadPortals();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
    loadPortals();
  }

  async function runNow(portal: Portal) {
    setRunning(portal.id);
    await act(() => api.portals.runNow(portal.id));
    setRunning(null);
  }

  function adapterName(key: string) {
    return adapters.find((a) => a.key === key)?.display_name ?? key;
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Portals</h1>
        <p className="text-sm text-slate-400 mb-4">
          Attach job sources here. Disabled portals are skipped by the scheduler and &quot;Scrape all&quot;.
        </p>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <div className="grid gap-3">
          {portals.map((portal) => (
            <div
              key={portal.id}
              className={`border rounded-lg p-4 bg-slate-900 flex justify-between items-center gap-4 ${
                portal.enabled ? "border-slate-700" : "border-slate-800 opacity-60"
              }`}
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {portal.name} <span className="text-xs text-slate-400">({adapterName(portal.adapter_type)})</span>
                  {!portal.enabled && <span className="ml-2 text-xs text-amber-400">disabled</span>}
                </p>
                <p className="text-sm text-slate-400 truncate">
                  query: {portal.query || "(all)"}
                  {portal.location ? ` · ${portal.location}` : ""}
                  {portal.industry ? ` · ${portal.industry}` : ""}
                  {Object.values(portal.extra ?? {}).length ? ` · ${Object.values(portal.extra).join(" · ")}` : ""}
                </p>
                <p className="text-xs text-slate-500">
                  last run: {portal.last_run_at ? new Date(portal.last_run_at).toLocaleString() : "never"}
                  {portal.last_run_count != null ? ` · ${portal.last_run_count} new jobs` : ""}
                </p>
                {portal.last_error && <p className="text-xs text-red-400 mt-1">error: {portal.last_error}</p>}
              </div>
              <div className="flex gap-2 items-center shrink-0">
                <button
                  className="text-sm bg-slate-700 hover:bg-slate-600 rounded px-3 py-1"
                  onClick={() => act(() => api.portals.update(portal.id, { enabled: !portal.enabled }))}
                >
                  {portal.enabled ? "Detach" : "Re-attach"}
                </button>
                <button
                  className="text-sm bg-blue-700 hover:bg-blue-600 rounded px-3 py-1 disabled:opacity-50"
                  onClick={() => runNow(portal)}
                  disabled={running !== null}
                >
                  {running === portal.id ? "Running..." : "Run now"}
                </button>
                <button
                  className="text-sm bg-red-800 hover:bg-red-700 rounded px-3 py-1"
                  onClick={() => {
                    if (confirm(`Remove portal "${portal.name}"? Jobs it found are kept.`)) {
                      act(() => api.portals.remove(portal.id));
                    }
                  }}
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
        {adapterError ? (
          <p className="text-red-400 text-sm">
            Can&apos;t load source types from the scraper service: {adapterError}. Is the Python service running?
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <select className={input} value={adapterKey} onChange={(e) => setAdapterKey(e.target.value)}>
                {adapters.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.display_name}
                    {a.configured ? "" : " (not configured)"}
                  </option>
                ))}
              </select>
              <input
                className={input}
                placeholder="Name (e.g. Acme Careers)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                className={input}
                placeholder={adapter?.query_required ? "Search query (e.g. Software Engineer)" : "Title filter (optional)"}
                value={form.query}
                onChange={(e) => setForm({ ...form, query: e.target.value })}
                required={adapter?.query_required}
              />
              <input
                className={input}
                placeholder="Location (optional)"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
              <input
                className={`${input} col-span-2`}
                placeholder="Industry tag (optional, e.g. Fintech) - applied to every job from this portal"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
              {adapter?.fields.map((f) => (
                <input
                  key={`${adapter.key}.${f.key}`}
                  className={`${input} col-span-2`}
                  placeholder={`${f.label}${f.placeholder ? ` - ${f.placeholder}` : ""}`}
                  value={form.extra[f.key] ?? ""}
                  onChange={(e) => setForm({ ...form, extra: { ...form.extra, [f.key]: e.target.value } })}
                  required={f.required}
                />
              ))}
            </div>
            {adapter?.note && <p className="text-xs text-slate-400">{adapter.note}</p>}
            {adapter && !adapter.configured && (
              <p className="text-xs text-amber-400">This source isn&apos;t configured on the scraper service yet.</p>
            )}
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 w-fit disabled:opacity-50"
              disabled={!adapter}
            >
              Attach portal
            </button>
          </>
        )}
      </form>
    </div>
  );
}
