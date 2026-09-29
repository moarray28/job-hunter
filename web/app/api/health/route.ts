import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { env } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const [db, scraper] = await Promise.all([
    getDb()
      .then((d) => d.command({ ping: 1 }))
      .then(() => "ok")
      .catch((e: Error) => `error: ${e.message}`),
    fetch(`${env.scraperUrl}/health`, { cache: "no-store", signal: AbortSignal.timeout(5000) })
      .then((r) => (r.ok ? "ok" : `error: HTTP ${r.status}`))
      .catch((e: Error) => `error: ${e.message}`),
  ]);
  const ok = db === "ok" && scraper === "ok";
  return NextResponse.json({ status: ok ? "ok" : "degraded", db, scraper }, { status: ok ? 200 : 503 });
}
