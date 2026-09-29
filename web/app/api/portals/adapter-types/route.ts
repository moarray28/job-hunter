import { NextResponse } from "next/server";
import { handler, HttpError } from "@/lib/server/http";
import { scraper, ScraperError } from "@/lib/server/scraperClient";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  try {
    return NextResponse.json(await scraper.adapters());
  } catch (err) {
    if (err instanceof ScraperError) throw new HttpError(502, err.message);
    throw err;
  }
});
