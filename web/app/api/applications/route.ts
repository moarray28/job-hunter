import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { withJobInfo } from "@/lib/server/applications";
import { collections } from "@/lib/server/db";
import { handler, HttpError, isDuplicateKey, parseBody, toObjectId } from "@/lib/server/http";
import { ApplicationCreate } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const docs = await (await collections.applications()).find({}).sort({ applied_at: -1 }).toArray();
  return NextResponse.json(await withJobInfo(docs));
});

export const POST = handler(async (req: Request) => {
  const body = await parseBody(req, ApplicationCreate);
  const jobs = await collections.jobs();
  const jobId = toObjectId(body.job_id);
  if (!(await jobs.findOne({ _id: jobId }, { projection: { _id: 1 } }))) {
    throw new HttpError(404, "Job not found");
  }

  const now = new Date();
  const apps = await collections.applications();
  let insertedId: ObjectId;
  try {
    ({ insertedId } = await apps.insertOne({ ...body, applied_at: now, updated_at: now }));
  } catch (err) {
    if (isDuplicateKey(err)) throw new HttpError(409, "An application for this job already exists");
    throw err;
  }
  await jobs.updateOne({ _id: jobId }, { $set: { status: "applied" } });

  const [created] = await withJobInfo([(await apps.findOne({ _id: insertedId }))!]);
  return NextResponse.json(created, { status: 201 });
});
