import { NextResponse } from "next/server";
import { handler } from "@/lib/server/http";
import { reprocessAllJobs } from "@/lib/server/pipeline";

export const dynamic = "force-dynamic";

export const POST = handler(async () => NextResponse.json({ updated: await reprocessAllJobs() }));
