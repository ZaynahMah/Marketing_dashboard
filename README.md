# Tata CLiQ Luxury — Social Intelligence

An internal analytics workspace that replaces the daily manual reporting workflow. Drop the **Meta Business Suite** organic export and the **paid campaign** export; the app matches every post by its Instagram link, merges organic + paid into **one consolidated dataset**, and produces:

- a downloadable **consolidated Excel** in the exact master schema,
- an **Executive Audit** (Layer 1) for leadership,
- a **Performance Dashboard** (Layer 2) for marketing managers,
- **strategy, recommendations and a 30-day planner** grounded in the Tata CLiQ Luxury content brief — every line backed by numbers.

---

## How the merge works

The two exports overlap. The stable join key is the **Instagram shortcode** inside each permalink — the same code appears whether the URL is `/reel/`, `/reels/`, `/p/`, or carries `?igsh=…` query params.

```
/reel/DXyO0wpsU8r/            ┐
/reels/DXyO0wpsU8r/           ├─► shortcode  DXyO0wpsU8r
/p/DXyO0wpsU8r/?igsh=…&img=1  ┘
```

Pipeline: paid rows are aggregated by shortcode (spend and volumes summed across every campaign line item), organic rows are aggregated by shortcode, then the two are joined with a **full outer join** → exactly one consolidated row per post. No duplicates, nothing dropped. Posts present in only one source keep the other side blank rather than shifting the schema.

Validated against the sample exports: 81 organic posts + 808 paid rows (106 unique paid posts) → **106 consolidated posts**, all 81 organic posts matched to paid.

---

## Recommended stack (and what this repo uses)

| Layer | Choice | Why |
|---|---|---|
| Frontend + Backend | **Next.js 14 (App Router) + TypeScript** | One deployable unit, first-class on Vercel, strongly typed. |
| Parsing / merge | **PapaParse** + a typed merge engine (`src/lib`) | Deterministic, testable, no black boxes. |
| Excel generation | **SheetJS (xlsx)** | Writes the exact master schema, blank-safe. |
| Charts | **Recharts** | Clean, themable, enterprise register. |
| Persistence | **IndexedDB** (localforage) by default | Historical uploads persist with **zero backend config** — deploys to Vercel instantly. |
| AI orchestration | **Evidence-based insight engine** (`src/lib/insights.ts`) | Every recommendation is computed from real deltas and phrased in the TCL register. No hallucinated opinions. Optional LLM layer documented below. |

### Two deliberate engineering decisions

1. **Processing runs in the browser.** Merge, Excel and insights are pure functions with no server dependency, so the app deploys to Vercel with no API keys, no database, no cold starts. Your data never leaves the device.
2. **Persistence starts as IndexedDB.** History is per-browser out of the box. The whole app depends only on the `HistoryStore` interface in `src/lib/store.ts`, so upgrading to shared team-wide history is a single-file swap — see below.

---

## Project structure

```
src/
  app/            layout, global styles, page orchestrator (upload · two layers · history)
  components/     Upload · ExecutiveAudit · PerformanceDashboard · PaidMedia · PostTable · Planner · Charts · ui
  lib/
    schema.ts     MASTER_COLUMNS — the immutable Excel contract + ConsolidatedPost type
    normalize.ts  shortcode extraction, number/currency/percent parsing, formatters
    merge.ts      aggregate + full-outer-join engine  ◄── core
    classify.ts   content-bucket classifier
    brief.ts      TCL brand context encoded from the Operating Brief
    metrics.ts    KPI totals, bucket/format stats, post scoring, period deltas
    insights.ts   executive summary · strategic insights · recommendations (all numeric)
    planner.ts    30-day content calendar
    excel.ts      consolidated workbook (exact master schema)
    store.ts      persistence (IndexedDB default; Postgres path documented)
```

---

## Run locally

Requires Node 18.18+.

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit (passes clean)
npm run build        # production build
```

Drop your two CSV exports on the upload screen and the report builds itself.

---

## Deploy: GitHub → Vercel

**1. Push to GitHub**

```bash
cd tcl-luxury-analytics
git init
git add .
git commit -m "TCL Luxury Social Intelligence"
git branch -M main
git remote add origin https://github.com/<you>/tcl-luxury-analytics.git
git push -u origin main
```

**2. Deploy on Vercel**

1. Go to [vercel.com/new](https://vercel.com/new) and **Import** the GitHub repo.
2. Framework preset is auto-detected as **Next.js** — leave build settings default (`next build`, output handled automatically).
3. No environment variables are needed for the default (browser-storage) setup.
4. Click **Deploy**. First build takes ~1–2 minutes; you get a `*.vercel.app` URL.

Every push to `main` redeploys automatically. To add a custom domain: Vercel → Project → **Settings → Domains**.

---

## Upgrading to a shared database (team-wide history)

The default stores history in each user's browser. To share history across the marketing team, keep everything else and replace only `src/lib/store.ts` with an adapter that implements the same `HistoryStore` interface.

Recommended: **Vercel Postgres** or **Supabase** (both have generous free tiers).

```sql
create table uploads (
  id           text primary key,
  created_at   timestamptz not null default now(),
  label        text not null,
  report       jsonb not null,
  posts        jsonb not null,
  organic_file text,
  paid_file    text
);
```

Then implement `list / get / save / remove` against that table (via `@vercel/postgres` or `@supabase/supabase-js`), move the merge call into a Next.js Route Handler if you want server-side processing, and set the connection string as a Vercel environment variable. No component changes required.

---

## Three-tier reporting (daily · weekly · monthly)

The workspace accumulates every upload in history and derives three report levels from the combined data. Switch levels from the header; each has its own download.

**Daily** — the existing executive audit + performance dashboard, plus a downloadable **daily consolidated sheet** in the expanded 26-column schema (Date, Boosting Amount/Split, Likes/Saves/Shares/Comments, Interactions, Reach, Views, Profile Activity, Follows, ER% basis reach, CPV/CPR/CPE/CTR, Avg Watch Time & Skip Rate for Reels, and a **per-post qualitative read derived from that post's own metrics** — never generic). Columns the Instagram export can't provide (Reposts, per-post liker demographics) are shown as `—` rather than invented.

**Weekly** — unlocks with ≥1 day of data (partial weeks allowed; flagged "full week" at 7+ days). A senior-strategist weekly review: content insights, consumer conversations, trend watch, sentiment, influencer & UGC review, campaign learnings, brand health, business-level and audience intelligence.

**Monthly** — a full Instagram handle audit: performance overview, key wins & red flags, format and content-pattern analysis, audience insights, content-bucket analysis, brand-position audit, competitive intelligence (Myntra / AJIO / Nykaa via live research), white space, Stop/Continue/Start recommendations and a 30-day plan.

The quantitative half of every report (KPIs, per-day/per-week rollups, bucket and format tables, top/lowest) is always computed by the deterministic engine and is available even with no API key. The **strategist narrative, trends, sentiment, competitive read and predictions are Gemini-authored** and grounded in the brief + live web; they appear once you click Generate.

### What the two Instagram exports can and can't support

The pipeline ingests the organic (Meta Business Suite) and paid exports. Some requested sections need data those files don't contain, so the app is explicit rather than fabricating:

- **Comment/DM text sentiment, consumer-conversation mining** — the exports carry *counts*, not message text. The AI infers themes cautiously and flags in each note that a precise read needs a comment/DM export.
- **Follower demographics (gender/age), gross/net follower growth** — not in the post exports; surfaced as "requires an audience-level export".
- **Tata CLiQ Fashion (TCF)** — a separate handle. Upload TCF's exports as their own history entries; the weekly/monthly frameworks apply identically.
- **Competitor metrics (Myntra/AJIO/Nykaa)** — compared qualitatively via live search; no competitor numbers are invented. Hard numbers can be added through the Competitor Benchmark input.

To feed these, add the relevant exports as additional uploads — the system accumulates and compares week-vs-week and month-vs-month automatically.



The deterministic engine authors every number, chart, ranking, KPI, cost figure and the Excel file. On top of that, an **optional Gemini layer** rewrites only the *narrative and strategy* sections, grounded in live, India-relevant luxury signals via Google Search. It is fully modular: **with no key configured, the dashboard runs exactly as before** and these sections fall back to the deterministic output.

**AI writes only:** Executive Summary (optional), Strategic Recommendations, Content Strategy, 30-Day Planner, "What to post next", Budget-allocation guidance, Emerging opportunities.

**AI never touches:** merge logic, KPI calculations, charts, dashboard metrics, Excel generation, cost calculations, or post ranking. Those stay in `src/lib/*` as the single source of truth.

### How it stays cheap and safe

- **Never sends raw data.** Only a compact, numbers-only JSON summary (`src/lib/ai/summary.ts`) built from already-computed analytics leaves the browser — no CSVs, no PII.
- **The brief is cached server-side.** `src/lib/ai/brief-context.ts` is a constant injected on the server, so it's never re-transmitted from the client.
- **Runs automatically, once.** There are no AI buttons. When a report becomes active and a key is present, the analysis generates a single time and is cached per upload + level, so switching tabs or report levels never re-calls the API. Output tokens are capped and the prompt asks for concise, board-ready lines to keep cost minimal.
- **Lightweight model by default.** Gemini 2.5 Flash; switchable to Flash-Lite (cheapest), 3.5 Flash, or Pro tiers from the UI.
- **The key stays on the server.** It's read only inside the `/api/ai` Route Handler (`process.env.GEMINI_API_KEY`) and is never exposed to the browser.

### AI usage & cost

Every generated report shows a **Token Usage** footer: Input Tokens, Output Tokens, Total Tokens and Model Used (informational metadata only). A small estimated cost from published Gemini rates (`src/lib/ai/pricing.ts`) is appended; the API returns no bill figure, so treat it as an estimate.

### Enabling it on Vercel

1. Get a key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Vercel → Project → **Settings → Environment Variables** → add `GEMINI_API_KEY` = your key → save.
3. Optionally add `GEMINI_MODEL` (e.g. `gemini-2.5-flash`) — otherwise the default is used.
4. **Redeploy** so the variable is picked up.

Locally, create `.env.local` with `GEMINI_API_KEY=...` and run `npm run dev`. Without a key, the app still works — the strategist sections are simply omitted, a quiet note appears, and all metrics, charts, downloads and the deterministic planner remain fully functional.

### AI module map

```
src/lib/ai/
  types.ts          shared request/response types (no secrets)
  summary.ts        compact numbers-only summary sent to Gemini
  brief-context.ts  cached TCL brand context (server constant)
  prompt.ts         prompt: ground-truth numbers + brief + live-research instructions
  pricing.ts        model catalogue + token/grounding cost estimation
  gemini.ts         server-only Gemini caller (Search grounding, JSON parse, usage)
  client.ts         client fetch wrappers to /api/ai
src/app/api/ai/route.ts   holds the key; POST generates, GET probes status
src/components/ai/        AiProvider (state+cache) · AiControls · AiSections · AiUsage
```

A note on grounding cost: Search grounding on the Gemini **2.x** family bills per grounded prompt (~$35 / 1,000) after the free quota, while the **3.x** family is cheaper (~$14 / 1,000, with a monthly free allowance). If you refresh strategy frequently, Flash-Lite plus the 3.x track is the most economical — or disable grounding in `src/lib/ai/gemini.ts` to run brief-only (non-live) strategy at pure token cost.

---

## Data notes

- Sample exports are **not** bundled (the brief is marked confidential). Drop your own exports to test.
- Metrics not present in the exports (e.g. website clicks, precise watch time, skip rate) render as `—` or use a labelled proxy (thruplays for watch time) rather than being invented — the master schema is never altered.
- The `Consolidated` sheet is the master contract; a second `Analytics Appendix` sheet carries paid + derived efficiency columns so nothing is lost while the master stays pure.

*Confidential — For internal use only · Tata CLiQ Luxury · 2026*

### Ambient AI (no buttons) & competitor listening

AI is embedded, not triggered. The strategist analysis auto-populates the named report sections — Executive Summary, What Worked / What Didn't (with the *why*), Where to Act Next, Recommendations for Improvement, Strategic Priorities, Risks & Watchouts, Growth Levers, Opportunities and the 30-day Planner — each finding answering what happened, why, the business impact, the recommended action and its expected outcome, ranked P1–P3. Everything is grounded in the computed numbers plus live search, written concisely for a marketing team.

Competitor tracking (Myntra, AJIO, Nykaa and more) is handled in a dedicated Social Listener workspace; the dashboard's **Competitors** tab opens it directly: https://sociallistener-xi.vercel.app/collections/cmrkx3lxv00007ohv1cg3mfey/pulse
