
export const env = {
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017",
  mongoDb: process.env.MONGODB_DB || "job_hunter",
  scraperUrl: (process.env.SCRAPER_URL || "http://localhost:8000").replace(/\/$/, ""),
  scraperToken: process.env.SCRAPER_TOKEN || "",
  scrapeIntervalHours: Number(process.env.SCRAPE_INTERVAL_HOURS ?? 6),
};
