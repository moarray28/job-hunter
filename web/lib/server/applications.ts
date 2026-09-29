import { ObjectId, WithId } from "mongodb";
import { ApplicationDoc, collections } from "./db";
import { serialize } from "./http";

/** Attach job title/company/url to application docs for display. */
export async function withJobInfo(docs: WithId<ApplicationDoc>[]) {
  const jobIds = docs.map((d) => d.job_id).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const jobs = await (await collections.jobs())
    .find({ _id: { $in: jobIds } }, { projection: { title: 1, company: 1, url: 1 } })
    .toArray();
  const byId = new Map(jobs.map((j) => [j._id.toHexString(), j]));
  return docs.map((d) => {
    const job = byId.get(d.job_id);
    return { ...serialize(d), job_title: job?.title ?? null, company: job?.company ?? null, job_url: job?.url ?? null };
  });
}

/** Mirror application progress onto the job's pipeline status. */
export const JOB_STATUS_FOR_APPLICATION: Record<string, string> = {
  applied: "applied",
  interviewing: "interviewing",
  offer: "offer",
  rejected: "rejected",
};
