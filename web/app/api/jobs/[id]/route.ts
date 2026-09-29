import { NextResponse } from "next/server";
import { z } from "zod";
import { collections } from "@/lib/server/db";
import { handler, HttpError, parseBody, serialize, toObjectId } from "@/lib/server/http";
import { JOB_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const JobPatch = z
  .object({
    status: z.enum(JOB_STATUSES).optional(),
    notes: z.string().max(10_000).nullable().optional(),
    industry: z.string().max(100).nullable().optional(),
  })
  .strict();

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  const doc = await (await collections.jobs()).findOne({ _id: toObjectId(params.id) });
  if (!doc) throw new HttpError(404, "Job not found");
  return NextResponse.json(serialize(doc));
});

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const _id = toObjectId(params.id);
  const patch = await parseBody(req, JobPatch);
  if (!Object.keys(patch).length) throw new HttpError(400, "No fields to update");

  const doc = await (await collections.jobs()).findOneAndUpdate(
    { _id },
    { $set: patch },
    { returnDocument: "after" },
  );
  if (!doc) throw new HttpError(404, "Job not found");

  // Keep the application tracker in sync when a job is marked applied from the status dropdown.
  if (patch.status === "applied") {
    const now = new Date();
    await (await collections.applications()).updateOne(
      { job_id: params.id },
      { $setOnInsert: { job_id: params.id, status: "applied", applied_at: now, updated_at: now } },
      { upsert: true },
    );
  }
  return NextResponse.json(serialize(doc));
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const result = await (await collections.jobs()).deleteOne({ _id: toObjectId(params.id) });
  if (!result.deletedCount) throw new HttpError(404, "Job not found");
  await (await collections.applications()).deleteOne({ job_id: params.id });
  return new NextResponse(null, { status: 204 });
});
