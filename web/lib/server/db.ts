import { Collection, Db, MongoClient } from "mongodb";
import { env } from "./env";

export interface JobDoc {
  title: string;
  company: string;
  location?: string | null;
  url: string;
  description?: string | null;
  salary?: string | null;
  posted_at?: string | null;
  source_portal: string;
  status: string;
  match_score: number;
  experience_level: string | null;
  min_years_experience: number | null;
  is_remote: boolean;
  industry: string | null;
  scraped_at: Date;
  notes?: string | null;
}

export interface PortalDoc {
  name: string;
  adapter_type: string;
  enabled: boolean;
  query: string;
  location?: string | null;
  industry?: string | null;
  extra: Record<string, string>;
  fetch_details?: boolean | null;
  last_run_at?: Date | null;
  last_run_count?: number | null;
  last_error?: string | null;
}

export interface ApplicationDoc {
  job_id: string;
  resume_version?: string | null;
  cover_letter?: string | null;
  notes?: string | null;
  status: string;
  applied_at: Date;
  updated_at: Date;
}

export interface ProfileDoc {
  full_name?: string | null;
  target_titles: string[];
  skills: string[];
  locations: string[];
  resume_text?: string | null;
  min_salary?: number | null;
}

// Cached on globalThis so Next.js dev hot-reloads don't open a new pool each time.
const g = globalThis as unknown as { _mongo?: Promise<Db> };

async function connect(): Promise<Db> {
  const client = await new MongoClient(env.mongoUri).connect();
  const db = client.db(env.mongoDb);
  await Promise.all([
    db.collection("jobs").createIndex({ url: 1 }, { unique: true }),
    db.collection("jobs").createIndex({ scraped_at: -1 }),
    db.collection("jobs").createIndex({ match_score: -1 }),
    db.collection("jobs").createIndex({ status: 1 }),
    db.collection("applications").createIndex({ job_id: 1 }, { unique: true }),
    db.collection("portals").createIndex({ name: 1 }, { unique: true }),
  ]);
  return db;
}

export function getDb(): Promise<Db> {
  if (!g._mongo) {
    g._mongo = connect().catch((err) => {
      g._mongo = undefined;
      throw err;
    });
  }
  return g._mongo;
}

export const collections = {
  jobs: async (): Promise<Collection<JobDoc>> => (await getDb()).collection<JobDoc>("jobs"),
  portals: async (): Promise<Collection<PortalDoc>> => (await getDb()).collection<PortalDoc>("portals"),
  applications: async (): Promise<Collection<ApplicationDoc>> =>
    (await getDb()).collection<ApplicationDoc>("applications"),
  profile: async (): Promise<Collection<ProfileDoc>> => (await getDb()).collection<ProfileDoc>("profile"),
};
