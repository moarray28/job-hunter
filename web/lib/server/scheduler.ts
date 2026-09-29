import { env } from "./env";
import { runAllEnabledPortals } from "./pipeline";

const g = globalThis as unknown as { _scrapeTimer?: NodeJS.Timeout };

/**
 * In-process interval scheduler. Only works on a long-running Node server
 * (`next start`, Docker). On serverless hosts set SCRAPE_INTERVAL_HOURS=0 and
 * call POST /api/scrape/run-all from an external cron with CRON_SECRET.
 */
export function startScheduler(): void {
  const hours = env.scrapeIntervalHours;
  if (!(hours > 0) || g._scrapeTimer) return;

  let running = false;
  g._scrapeTimer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const results = await runAllEnabledPortals();
      console.log("[scheduler] scrape finished", results);
    } catch (err) {
      console.error("[scheduler] scrape failed", err);
    } finally {
      running = false;
    }
  }, hours * 3_600_000);
  console.log(`[scheduler] scraping enabled portals every ${hours}h`);
}
