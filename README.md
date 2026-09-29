# Job Hunter

A personal, single-user job search tool. It pulls listings from many sources into **one
dashboard**: company career pages, Indeed and Google Jobs. You can filter them however you
like, rank them against your skills, and track every application you send.

> **Scope:** aggregate and track only. The tool never auto-submits applications to
> LinkedIn or Indeed, so your accounts don't break those sites' terms or get flagged.
> You click through to the real posting, apply there, and then press **Mark applied**.

## How it works

```
 ┌───────────────────────────────┐   X-Service-Token   ┌──────────────────────┐
 │  web/  (Next.js, :3000)       │ ──────────────────▶ │ scraper/ (FastAPI)   │
 │  ├─ pages (UI)                │                     │ :8000                │
 │  ├─ app/api/*  (REST API)     │                     │ ├─ adapters/ sources │
 │  ├─ lib/server/filters.ts     │                     │ └─ enricher (JD      │
 │  ├─ scheduler (every 6h)      │                     │    detail fetch)     │
 │  └─ classifier / matcher      │                     └──────────────────────┘
 └──────────────┬────────────────┘
                ▼
          ┌──────────┐
          │ MongoDB  │
          └──────────┘
```

- **web/** is the whole app: UI, REST API, MongoDB access, filters, scoring and the scheduler.
- **scraper/** is a small stateless Python service that fetches listings and job descriptions.
  It has no database and is only called by `web`.

1. **Attach a portal.** A portal is one configured source: an adapter type plus its settings
   (search query, location, careers URL, industry tag).
2. **Scrape.** Enabled portals run every 6 hours, or on demand with **Run now** or **Scrape all**.
   For each new job the app:
   - skips URLs it has already seen (deduplication);
   - fetches the job's detail page to get the description, when the listing didn't include one;
   - guesses the **experience level**, the **minimum years required**, and whether the job is **remote**;
   - computes a **match score** from the skills and target titles in your Profile.
3. **Filter and triage.** Add filters, sort by best match, change statuses, open the real posting and apply.
4. **Track.** Each application records its status, the resume version you used, and your notes.

## Features

### Pages
| Page | What it does |
|---|---|
| **Jobs** | All scraped jobs, with the add-on filter bar, sorting, status changes and "Mark applied" |
| **Portals** | Attach a source, detach it (disable), remove it, or run it now. Shows the last run's time, job count and any error |
| **Applications** | Tracks status (draft → applied → interviewing → offer or rejected), resume version and notes |
| **Profile** | Target titles, skills, locations, minimum salary and resume text. Saving it re-scores every job |

### Sources (adapters)
| Adapter | Needs | Notes |
|---|---|---|
| `generic_career` | a careers page URL | Works on most company careers pages, including Greenhouse, Lever, Workday, Ashby and SmartRecruiters |
| `indeed` | nothing | Reads public search results. Indeed often blocks automated requests, so it can come back empty |
| `google_jobs` | `SERPAPI_KEY` | Google Jobs through [SerpAPI](https://serpapi.com). It includes listings from LinkedIn, Indeed and others, and is the most reliable source |

### Filters (add-on)
On the Jobs page, click **+ Add filter** to add a filter and × to remove it. Your active
filters and sort order are saved in the browser.

| Filter | Type | Behaviour |
|---|---|---|
| Role / title | text | The title contains **any** of the comma-separated terms |
| Location | text | The location contains any of the terms |
| Remote only | toggle | Only jobs detected as remote |
| Experience level | multi-select | internship, entry, mid, senior, lead, principal, executive |
| Max years required | number | Hides jobs that ask for more years. Jobs with no stated years are kept |
| Industry | multi-select | Taken from each portal's industry tag |
| Company | text | The company name contains any of the terms |
| JD contains (all) | text | The title or description must contain **every** term, e.g. `python, aws` |
| Exclude keywords | text | Hides jobs that mention any of the terms, e.g. `clearance, unpaid` |
| Status / Source portal | multi-select | Your pipeline status, or the portal the job came from |
| Min match % | number | Match score against your Profile |
| Found in last N days | number | How recently the job was scraped |

## Configuration

### Web: `web/.env.local` (copy it from `web/.env.example`)
| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string. For MongoDB Atlas, use its `mongodb+srv://...` URI |
| `MONGODB_DB` | `job_hunter` | Database name |
| `SCRAPER_URL` | `http://localhost:8000` | URL of the scraper service |
| `SCRAPER_TOKEN` | *(empty)* | Shared secret sent to the scraper. Must equal the scraper's `SERVICE_TOKEN` |
| `SCRAPE_INTERVAL_HOURS` | `6` | Built-in schedule. Set `0` on serverless hosts and use an external cron instead |
| `APP_USERNAME` | `me` | Login username |
| `APP_PASSWORD` | *(empty)* | When set, every page and API route requires HTTP Basic auth. **Always set this when deployed** |
| `CRON_SECRET` | *(empty)* | Lets an external cron call `POST /api/scrape/run-all` with `Authorization: Bearer <CRON_SECRET>` |

### Scraper: `scraper/.env` (copy it from `scraper/.env.example`)
| Variable | Default | Purpose |
|---|---|---|
| `SERVICE_TOKEN` | *(empty)* | Required `X-Service-Token` header. Empty disables the check (local dev only) |
| `SERPAPI_KEY` | *(empty)* | Needed only for the `google_jobs` adapter |

## Running locally

### Option A: Docker (easiest)
Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).
```bash
cp .env.example .env        # set SERVICE_TOKEN, and optionally APP_PASSWORD / SERPAPI_KEY
docker compose up --build
```
- UI: http://localhost:3000
- Scraper API docs (Swagger): http://localhost:8000/docs

### Option B: without Docker
Requires Python 3.11+, Node 20+, and MongoDB, either a
[local install](https://www.mongodb.com/try/download/community) or a free
[Atlas](https://www.mongodb.com/atlas) cluster.
```bash
# Terminal 1: scraper
cd scraper
cp .env.example .env
python -m venv .venv
source .venv/Scripts/activate        # Windows Git Bash (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2: web
cd web
cp .env.example .env.local
npm install
npm run dev
```

### Tests
```bash
cd web && npm test                                              # filters, classifier, matcher
cd scraper && pip install -r requirements-dev.txt && pytest     # adapter parsers
```

### First use
1. Go to **Profile** and add your target titles and skills. These drive the match score.
2. Go to **Portals** and attach a source, e.g. a *Generic Career Page* pointing at a company's careers URL.
3. Click **Run now**, then open **Jobs** and add filters.

## Extending

**Add a filter.** Append one entry to `FILTERS` in `web/lib/server/filters.ts`:
```ts
{ key: "salary", label: "Salary mentions", kind: "text", build: anyTermIn("description") },
```
The API accepts it right away and the UI shows it under **+ Add filter**. Available builders:
`anyTermIn`, `allTermsIn`, `noTermIn`, `oneOf`, `isTrue`, or your own function that
returns a MongoDB query.

**Add a source.** Create `scraper/app/adapters/<name>.py` with a class that subclasses
`BaseAdapter`. Set `key` and `display_name`, implement `async search(req) -> list[JobPosting]`,
and register it in `scraper/app/adapters/registry.py`. It then appears in the Portals dropdown.

## Project structure
```
web/                     Next.js app (UI + API + database)
  app/                   pages: jobs, portals, applications, profile
  app/api/               REST endpoints
  components/            Nav, FilterBar
  lib/api.ts             typed client used by the pages
  lib/server/            db, filters, classifier, matcher, pipeline, scheduler, scraper client
  middleware.ts          Basic-auth login + cron secret
  instrumentation.ts     starts the scheduler
scraper/                 FastAPI scraping service
  app/adapters/          one file per job source + registry
  app/enricher.py        job description fetcher
  app/main.py            /adapters, /scrape, /enrich, /health
  tests/
docker-compose.yml       mongo + scraper + web
```

## Deployment

**GitHub Pages can't run this app**, because Pages only serves static files and the app needs
a Node server, a Python service and a database. Push the code to GitHub, then connect these hosts to the repo:

| Part | Suggested free host | Settings |
|---|---|---|
| Database | MongoDB Atlas (M0 free tier) | Allow network access from your hosts, copy the `mongodb+srv://` URI |
| Scraper | Render, Railway or Fly.io | Root directory `scraper/`, uses `scraper/Dockerfile` (honours `$PORT`). Set `SERVICE_TOKEN`, `SERPAPI_KEY` |
| Web | Vercel (root directory `web/`), or any Docker host using `web/Dockerfile` | Set the variables from `web/.env.example`, including `APP_PASSWORD` |

On **Vercel** (serverless), the in-process scheduler doesn't run. Set `SCRAPE_INTERVAL_HOURS=0`,
set `CRON_SECRET`, and have a cron service (e.g. cron-job.org or a GitHub Actions schedule) call:
```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/scrape/run-all
```
Free backend tiers often sleep when idle, so the first scrape after a pause can be slow.

### Branches
| Branch | Role |
|---|---|
| `main` | Default branch. **Production**: point production hosts at this branch |
| `feature` | All changes land here first. Promote to `main` once CI passes |

```bash
git checkout feature   # work, commit, git push
git checkout main && git merge --ff-only feature && git push && git checkout feature
```

## Known limitations
- Scrapers depend on each site's page structure and may need updating when those sites change.
- The experience level and remote status are guesses made from keywords.
- Industry comes from the portal's tag, not from the individual job.
