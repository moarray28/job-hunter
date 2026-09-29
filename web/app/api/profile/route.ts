import { NextResponse } from "next/server";
import { collections } from "@/lib/server/db";
import { handler, parseBody } from "@/lib/server/http";
import { loadProfile, reprocessAllJobs } from "@/lib/server/pipeline";
import { ProfileSchema } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

export const GET = handler(async () => NextResponse.json(await loadProfile()));

export const PUT = handler(async (req: Request) => {
  const profile = await parseBody(req, ProfileSchema);
  await (await collections.profile()).updateOne({}, { $set: profile }, { upsert: true });
  await reprocessAllJobs();
  return NextResponse.json(await loadProfile());
});
