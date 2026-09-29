"use client";

import { ActiveFilter, FilterDef } from "@/lib/api";

interface Props {
  defs: FilterDef[];
  active: ActiveFilter[];
  onChange: (active: ActiveFilter[]) => void;
}

const inputCls = "bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm";

export default function FilterBar({ defs, active, onChange }: Props) {
  const defsByKey = Object.fromEntries(defs.map((d) => [d.key, d]));
  const available = defs.filter((d) => !active.some((a) => a.key === d.key));

  function add(key: string) {
    const def = defsByKey[key];
    if (!def) return;
    onChange([...active, { key, values: def.kind === "boolean" ? ["true"] : [] }]);
  }

  function setValues(key: string, values: string[]) {
    onChange(active.map((a) => (a.key === key ? { ...a, values } : a)));
  }

  function remove(key: string) {
    onChange(active.filter((a) => a.key !== key));
  }

  function toggleOption(filter: ActiveFilter, option: string) {
    const values = filter.values.includes(option)
      ? filter.values.filter((v) => v !== option)
      : [...filter.values, option];
    setValues(filter.key, values);
  }

  return (
    <div className="flex flex-wrap gap-2 items-start">
      {active.map((filter) => {
        const def = defsByKey[filter.key];
        if (!def) return null;
        return (
          <div
            key={filter.key}
            className="flex flex-wrap items-center gap-2 border border-slate-600 rounded-lg px-2 py-1 bg-slate-900"
          >
            <span className="text-sm text-slate-300">{def.label}</span>

            {(def.kind === "text" || def.kind === "number") && (
              <input
                type={def.kind === "number" ? "number" : "text"}
                className={`${inputCls} ${def.kind === "number" ? "w-20" : "w-56"}`}
                placeholder={def.placeholder || ""}
                value={filter.values[0] || ""}
                onChange={(e) => setValues(filter.key, e.target.value ? [e.target.value] : [])}
              />
            )}

            {def.kind === "multiselect" &&
              (def.options?.length ? (
                def.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleOption(filter, opt)}
                    className={`text-xs rounded px-2 py-0.5 border ${
                      filter.values.includes(opt)
                        ? "bg-blue-600 border-blue-500"
                        : "bg-slate-800 border-slate-600 text-slate-400"
                    }`}
                  >
                    {opt}
                  </button>
                ))
              ) : (
                <span className="text-xs text-slate-500">no values yet</span>
              ))}

            <button
              type="button"
              className="text-slate-400 hover:text-red-400 px-1"
              onClick={() => remove(filter.key)}
              aria-label={`Remove ${def.label} filter`}
            >
              ×
            </button>
          </div>
        );
      })}

      {available.length > 0 && (
        <select
          className={inputCls}
          value=""
          onChange={(e) => add(e.target.value)}
        >
          <option value="">+ Add filter</option>
          {available.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
      )}

      {active.length > 0 && (
        <button type="button" className="text-sm text-slate-400 hover:text-white" onClick={() => onChange([])}>
          Clear all
        </button>
      )}
    </div>
  );
}
