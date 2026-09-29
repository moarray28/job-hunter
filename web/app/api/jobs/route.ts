import { NextRequest, NextResponse } from "next/server";
import type { Sort } from "mongodb";
import { collections } from "@/lib/server/db";
import { buildQuery } from "@/lib/server/filters";
import { handler, serialize } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const SORTS: Record<string, Sort> = {
  newest: { scraped_at: -1 },
  match: { match_score: -1, scraped_at: -1 },
};

export const GET = handler(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const sort = SORTS[params.get("sort") ?? "newest"] ?? SORTS.newest;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 200, 1), 1000);

  const jobs = await collections.jobs();
  const docs = await jobs
    .find(buildQuery(params), { projection: { description: 0 } })
    .sort(sort)
    .limit(limit)
    .toArray();
  return NextResponse.json(docs.map(serialize));
});
