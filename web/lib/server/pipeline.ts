import { AnyBulkWriteOperation, MongoBulkWriteError, WithId } from "mongodb";
import type { Profile, RunResult } from "../types";
import { classify } from "./classifier";
import { collections, JobDoc, PortalDoc } from "./db";
import { scoreJob } from "./matcher";
import { scraper } from "./scraperClient";

const MAX_DETAIL_FETCHES = 25;
const DEFAULT_FETCH_DETAILS: Record<string, boolean> = { generic_career: true };

export async function loadProfile(): Promise<Profile> {
  const doc = await (await collections.profile()).findOne({});
  return {
    full_name: doc?.full_name ?? null,
    target_titles: doc?.target_titles ?? [],
    skills: doc?.skills ?? [],
    locations: doc?.locations ?? [],
    resume_text: doc?.resume_text ?? null,
    min_salary: doc?.min_salary ?? null,
  };
}

export async function runPortal(portal: WithId<PortalDoc>): Promise<RunResult> {
  const portals = await collections.portals();
  const jobs = await collections.jobs();
  const now = new Date();

  try {
    const postings = await scraper.scrape({
      adapter_type: portal.adapter_type,
      query: portal.query,
      location: portal.location,
      extra: portal.extra ?? {},
    });

    const unique = [...new Map(postings.map((p) => [p.url, p])).values()];
    const existing = new Set(
      (await jobs.find({ url: { $in: unique.map((p) => p.url) } }, { projection: { url: 1 } }).toArray()).map(
        (d) => d.url,
      ),
    );
    const fresh = unique.filter((p) => !existing.has(p.url));

    const fetchDetails = portal.fetch_details ?? DEFAULT_FETCH_DETAILS[portal.adapter_type] ?? false;
    const needDetails = fresh.filter((p) => !p.description).slice(0, MAX_DETAIL_FETCHES);
    if (fetchDetails && needDetails.length) {
      try {
        const descriptions = await scraper.enrich(needDetails.map((p) => p.url));
        for (const p of needDetails) p.description = descriptions[p.url] ?? null;
      } catch {
        // Listings are still useful without descriptions; don't fail the run.
      }
    }

    const profile = await loadProfile();
    const docs: JobDoc[] = fresh.map((p) => ({
      title: p.title,
      company: p.company,
      location: p.location ?? null,
      url: p.url,
      description: p.description ?? null,
      salary: p.salary ?? null,
      posted_at: p.posted_at ?? null,
      source_portal: portal.name,
      status: "new",
      industry: portal.industry ?? null,
      scraped_at: now,
      match_score: scoreJob(p, profile),
      ...classify(p),
    }));

    let inserted = 0;
    if (docs.length) {
      try {
        inserted = (await jobs.insertMany(docs, { ordered: false })).insertedCount;
      } catch (err) {
        // A concurrent run may have inserted some of the same URLs first.
        if (!(err instanceof MongoBulkWriteError)) throw err;
        inserted = err.result.insertedCount;
      }
    }

    await portals.updateOne(
      { _id: portal._id },
      { $set: { last_run_at: now, last_run_count: inserted, last_error: null } },
    );
    return { portal: portal.name, count: inserted, error: null };
  } catch (err) {
    const message = (err as Error).message;
    await portals.updateOne(
      { _id: portal._id },
      { $set: { last_run_at: now, last_run_count: 0, last_error: message } },
    );
    return { portal: portal.name, count: 0, error: message };
  }
}

export async function runAllEnabledPortals(): Promise<RunResult[]> {
  const portals = await (await collections.portals()).find({ enabled: true }).toArray();
  const results: RunResult[] = [];
  for (const portal of portals) results.push(await runPortal(portal));
  return results;
}

/** Recompute match score and derived fields for every stored job. */
export async function reprocessAllJobs(): Promise<number> {
  const jobs = await collections.jobs();
  const profile = await loadProfile();
  const ops: AnyBulkWriteOperation<JobDoc>[] = [];

  for await (const doc of jobs.find({}, { projection: { title: 1, location: 1, description: 1 } })) {
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { match_score: scoreJob(doc, profile), ...classify(doc) } },
      },
    });
  }
  if (ops.length) await jobs.bulkWrite(ops, { ordered: false });
  return ops.length;
}
