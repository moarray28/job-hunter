/**
 * Declarative job filters. To add one, append a ServerFilterDef to FILTERS:
 * the API builds the Mongo query from it and the UI renders it from `kind`.
 */
import type { Filter } from "mongodb";
import { EXPERIENCE_LEVELS, FilterKind, JOB_STATUSES } from "../types";

type Clause = Filter<Record<string, unknown>>;
type Builder = (values: string[]) => Clause | null;

export interface ServerFilterDef {
  key: string;
  label: string;
  kind: FilterKind;
  build: Builder;
  options?: readonly string[];
  /** Load select options from distinct values of this DB field. */
  optionsField?: string;
  placeholder?: string;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rx = (term: string) => ({ $regex: escapeRegex(term), $options: "i" });

function terms(values: string[]): string[] {
  return values.flatMap((v) => v.split(",")).map((t) => t.trim()).filter(Boolean);
}

function lastNumber(values: string[]): number | null {
  const raw = values.at(-1);
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export const anyTermIn =
  (...fields: string[]): Builder =>
  (values) => {
    const t = terms(values);
    return t.length ? { $or: fields.flatMap((f) => t.map((term) => ({ [f]: rx(term) }))) } : null;
  };

export const allTermsIn =
  (...fields: string[]): Builder =>
  (values) => {
    const t = terms(values);
    return t.length ? { $and: t.map((term) => ({ $or: fields.map((f) => ({ [f]: rx(term) })) })) } : null;
  };

export const noTermIn =
  (...fields: string[]): Builder =>
  (values) => {
    const t = terms(values);
    return t.length ? { $nor: fields.flatMap((f) => t.map((term) => ({ [f]: rx(term) }))) } : null;
  };

export const oneOf =
  (field: string): Builder =>
  (values) => {
    const t = terms(values);
    return t.length ? { [field]: { $in: t } } : null;
  };

export const isTrue =
  (field: string): Builder =>
  (values) =>
    values.at(-1)?.toLowerCase() === "true" ? { [field]: true } : null;

const maxYears: Builder = (values) => {
  const n = lastNumber(values);
  // Jobs with no detectable years requirement are kept rather than hidden.
  return n === null ? null : { $or: [{ min_years_experience: { $lte: n } }, { min_years_experience: null }] };
};

const minMatchPercent: Builder = (values) => {
  const n = lastNumber(values);
  return n === null ? null : { match_score: { $gte: n / 100 } };
};

const scrapedWithinDays: Builder = (values) => {
  const n = lastNumber(values);
  return n === null ? null : { scraped_at: { $gte: new Date(Date.now() - n * 86_400_000) } };
};

export const FILTERS: ServerFilterDef[] = [
  { key: "role", label: "Role / title", kind: "text", build: anyTermIn("title"),
    placeholder: "e.g. backend, data engineer (comma = any)" },
  { key: "location", label: "Location", kind: "text", build: anyTermIn("location"),
    placeholder: "e.g. Bangalore, Remote (comma = any)" },
  { key: "remote", label: "Remote only", kind: "boolean", build: isTrue("is_remote") },
  { key: "experience_level", label: "Experience level", kind: "multiselect",
    build: oneOf("experience_level"), options: EXPERIENCE_LEVELS },
  { key: "max_years", label: "Max years required", kind: "number", build: maxYears, placeholder: "e.g. 5" },
  { key: "industry", label: "Industry", kind: "multiselect", build: oneOf("industry"), optionsField: "industry" },
  { key: "company", label: "Company", kind: "text", build: anyTermIn("company"), placeholder: "comma = any" },
  { key: "jd", label: "JD contains (all)", kind: "text", build: allTermsIn("title", "description"),
    placeholder: "e.g. python, aws (comma = all required)" },
  { key: "exclude", label: "Exclude keywords", kind: "text", build: noTermIn("title", "description"),
    placeholder: "e.g. clearance, unpaid" },
  { key: "status", label: "Status", kind: "multiselect", build: oneOf("status"), options: JOB_STATUSES },
  { key: "source_portal", label: "Source portal", kind: "multiselect", build: oneOf("source_portal"),
    optionsField: "source_portal" },
  { key: "min_score", label: "Min match %", kind: "number", build: minMatchPercent, placeholder: "0-100" },
  { key: "scraped_within_days", label: "Found in last N days", kind: "number", build: scrapedWithinDays,
    placeholder: "e.g. 7" },
];

const FILTERS_BY_KEY = new Map(FILTERS.map((f) => [f.key, f]));

export function buildQuery(params: URLSearchParams): Clause {
  const clauses: Clause[] = [];
  for (const key of new Set(params.keys())) {
    const clause = FILTERS_BY_KEY.get(key)?.build(params.getAll(key));
    if (clause) clauses.push(clause);
  }
  return clauses.length ? { $and: clauses } : {};
}
