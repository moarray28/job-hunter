# Job Hunter

A personal, single-user job search tool. It pulls listings from many sources into **one
dashboard**: company career pages, Indeed and Google Jobs. You can filter them however you
like, rank them against your skills, and track every application you send.

> **Scope:** aggregate and track only. The tool never auto-submits applications to
> LinkedIn or Indeed, so your accounts don't break those sites' terms or get flagged.
> You click through to the real posting, apply there, and then press **Mark applied**.

## How it works

```
 ┌──────────────┐     REST/JSON      ┌───────────────────────────┐        ┌──────────┐
 │  Next.js UI  │ ─────────────────▶ │  FastAPI backend          │ ─────▶ │ MongoDB  │
 │  :3000       │                    │  :8000                    │        │ :27017   │
 └──────────────┘                    │  ├─ adapters/  (sources)  │        └──────────┘
                                     │  ├─ filters.py (filters)  │
                                     │  ├─ scheduler (every 6h)  │
                                     │  └─ classifier / matcher  │
                                     └───────────────────────────┘
```

1. **Attach a portal.** A portal is one configured source: an adapter type plus its settings
   (search query, location, careers URL, industry tag).
2. **Scrape.** Enabled portals run every 6 hours, or on demand with **Run now** or **Scrape all**.
   For each new job the backend:
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

### Backend: `backend/.env` (copy it from `backend/.env.example`)
| Variable | Default | Purpose |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string. For MongoDB Atlas, use its `mongodb+srv://...` URI |
| `MONGO_DB` | `job_hunter` | Database name |
| `SERPAPI_KEY` | *(empty)* | Needed only for the `google_jobs` adapter |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | The frontend URLs allowed to call the API. This must be a JSON list |

### Frontend: `frontend/.env.local` (copy it from `frontend/.env.example`)
| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL. It's baked in at build time |

## Running locally

### Option A: Docker (easiest)
Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).
```bash
cp backend/.env.example backend/.env
docker compose up --build
```
- UI: http://localhost:3000
- API docs (Swagger): http://localhost:8000/docs

### Option B: without Docker
Requires Python 3.11+, Node 18+, and MongoDB, either a
[local install](https://www.mongodb.com/try/download/community) or a free
[Atlas](https://www.mongodb.com/atlas) cluster.
```bash
# Terminal 1: backend
cd backend
cp .env.example .env
python -m venv .venv
source .venv/Scripts/activate        # Windows Git Bash (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2: frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### First use
1. Go to **Profile** and add your target titles and skills. These drive the match score.
2. Go to **Portals** and attach a source, e.g. a *Generic Career Page* pointing at a company's careers URL.
3. Click **Run now**, then open **Jobs** and add filters.

## Extending

**Add a filter.** Append one entry to `FILTERS` in `backend/app/filters.py`:
```python
FilterDef("salary", "Salary mentions", "text", any_term_in("salary")),
```
The API accepts it right away and the UI shows it under **+ Add filter**. Available builders:
`any_term_in`, `all_terms_in`, `no_term_in`, `one_of`, `is_true`, or your own function that
returns a MongoDB query.

**Add a source.** Create `backend/app/adapters/<name>.py` with a class that subclasses
`BaseAdapter`. Set `key` and `display_name`, implement `async search(config) -> list[JobPosting]`,
and register it in `backend/app/adapters/registry.py`. It then appears in the Portals dropdown.

## Project structure
```
backend/
  app/
    adapters/     one file per job source + registry
    models/       Pydantic models (job, portal, application, profile)
    routers/      REST endpoints
    services/     scraping pipeline, classifier, matcher, description fetcher, scheduler
    filters.py    add-on filter definitions
    main.py       FastAPI app entrypoint
frontend/
  app/            Next.js pages (jobs, portals, applications, profile)
  components/     Nav, FilterBar
  lib/api.ts      typed API client
docker-compose.yml
```

## Deployment

GitHub stores the code. **GitHub Pages can't run this app**, because Pages only serves
static files and the app needs a Python server and a database. To run it online:

| Part | Suggested free host |
|---|---|
| Database | MongoDB Atlas (M0 free tier) |
| Backend | Render, Railway or Fly.io, using `backend/Dockerfile` |
| Frontend | Vercel (set `NEXT_PUBLIC_API_URL` to the backend's URL) |

⚠️ **Add authentication before deploying publicly.** The app has no login, so anyone with
the URL could read and change your data. Also note that free backend tiers often sleep when
idle, which pauses the 6-hour scrape schedule.

## Known limitations
- Scrapers depend on each site's page structure and may need updating when those sites change.
- The experience level and remote status are guesses made from keywords.
- Industry comes from the portal's tag, not from the individual job.
- There are no automated tests yet.
