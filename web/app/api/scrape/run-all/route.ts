import { NextResponse } from "next/server";
import { handler } from "@/lib/server/http";
import { runAllEnabledPortals } from "@/lib/server/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Called by the UI, and by external cron (Authorization: Bearer $CRON_SECRET, see middleware). */
export const POST = handler(async () => NextResponse.json(await runAllEnabledPortals()));
