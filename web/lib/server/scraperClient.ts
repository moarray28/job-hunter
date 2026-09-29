import type { AdapterInfo, JobPosting } from "../types";
import { env } from "./env";

export class ScraperError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit, timeoutMs = 60_000): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${env.scraperUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "X-Service-Token": env.scraperToken },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new ScraperError(`Scraper service unreachable at ${env.scraperUrl}: ${(err as Error).message}`, 503);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
    throw new ScraperError(detail || `Scraper returned HTTP ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export const scraper = {
  adapters: () => call<AdapterInfo[]>("/adapters", undefined, 10_000),

  scrape: async (req: {
    adapter_type: string;
    query: string;
    location?: string | null;
    extra: Record<string, string>;
  }) => (await call<{ postings: JobPosting[] }>("/scrape", { method: "POST", body: JSON.stringify(req) })).postings,

  enrich: async (urls: string[]) =>
    (
      await call<{ descriptions: Record<string, string | null> }>(
        "/enrich",
        { method: "POST", body: JSON.stringify({ urls }) },
        120_000,
      )
    ).descriptions,
};
