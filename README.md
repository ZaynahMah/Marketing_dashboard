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

### Optional: LLM-authored narrative

The insight engine is deterministic by design (numbers first, no hallucinated claims — the brief demands evidence). If you want an additional free-text narrative in the maison voice, add an Anthropic API key as a Vercel env var and call the model inside a Route Handler, feeding it `brief.ts` + the computed metrics. Keep the deterministic engine as the source of truth for anything numeric.

---

## Data notes

- Sample exports are **not** bundled (the brief is marked confidential). Drop your own exports to test.
- Metrics not present in the exports (e.g. website clicks, precise watch time, skip rate) render as `—` or use a labelled proxy (thruplays for watch time) rather than being invented — the master schema is never altered.
- The `Consolidated` sheet is the master contract; a second `Analytics Appendix` sheet carries paid + derived efficiency columns so nothing is lost while the master stays pure.

*Confidential — For internal use only · Tata CLiQ Luxury · 2026*
