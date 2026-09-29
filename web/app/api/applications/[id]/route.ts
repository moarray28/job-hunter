import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { JOB_STATUS_FOR_APPLICATION, withJobInfo } from "@/lib/server/applications";
import { collections } from "@/lib/server/db";
import { handler, HttpError, parseBody, toObjectId } from "@/lib/server/http";
import { ApplicationPatch } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const _id = toObjectId(params.id);
  const patch = await parseBody(req, ApplicationPatch);
  if (!Object.keys(patch).length) throw new HttpError(400, "No fields to update");

  const doc = await (await collections.applications()).findOneAndUpdate(
    { _id },
    { $set: { ...patch, updated_at: new Date() } },
    { returnDocument: "after" },
  );
  if (!doc) throw new HttpError(404, "Application not found");

  const jobStatus = patch.status && JOB_STATUS_FOR_APPLICATION[patch.status];
  if (jobStatus && ObjectId.isValid(doc.job_id)) {
    await (await collections.jobs()).updateOne(
      { _id: new ObjectId(doc.job_id) },
      { $set: { status: jobStatus } },
    );
  }

  const [out] = await withJobInfo([doc]);
  return NextResponse.json(out);
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const result = await (await collections.applications()).deleteOne({ _id: toObjectId(params.id) });
  if (!result.deletedCount) throw new HttpError(404, "Application not found");
  return new NextResponse(null, { status: 204 });
});
