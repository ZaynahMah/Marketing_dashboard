# Tata CLiQ Luxury — Social Intelligence Dashboard

Internal, confidential. Next.js 14 (App Router) + TypeScript. Deploys to Vercel.

## Deploy

1. Push to GitHub, import to Vercel.
2. Add env vars in Vercel:
   - `GEMINI_API_KEY` — required for the AI strategist and the daily Ideas endpoint.
   - `GEMINI_MODEL` — optional (defaults to `gemini-2.5-flash`).
3. Deploy.

That's the whole setup. The homepage takes uploads; everything else is client-side (persisted in IndexedDB) except the AI endpoints.

## What's new in this build

### Aug 2026 — Voice-anchored generation
- **Brand voice reference** extracted from 261 real @tatacliqluxury post + reel captions (with transcripts). Lives in `src/lib/ai/brand-voice.ts` and is injected into every content-generation prompt so recommendations sound like the account rather than a generic AI. Regenerate with `python3 scripts/extract-brand-voice.py && python3 scripts/build-voice-json.py && python3 scripts/gen-voice-ts.py`.
- **50 content recommendations** (up from 20), split into 10 flagship recurring + 40 trend-driven. Every recommendation now includes: **full ready-to-publish caption** in TCL voice with copy button, **per-brand rationale** (3-6 catalog brands with why-this-brand reasoning), **expected audience behaviour** (what they'll do and why), **cultural insight** (the deeper why-now read), plus the existing hook / creative concept / trend / KPI / execution fields.
- **Batched recommendations** run as 3 sequential Gemini calls with cross-batch trend deduplication — batch N is told which trends batches 1..N-1 already used so the model can't repeat "Diwali gifting" twelve times.
- **Deeper post analysis.** Every post read now includes: **trend alignment** (was this content riding an active trend that week?), **creative differentiation**, **storytelling quality**, **caption effectiveness**, **brand positioning** (reinforced or diluted luxury signal?), **visual narrative**, **CTA quality**, **timing & cultural relevance**, **what to repeat**, **what to improve**, **what to avoid**. The prompt now demands reasoning across 14 dimensions per post, not just the numbers.
- **Temperature raised above 1** for all creative generation per the brief: recommendations 1.3, analysis 1.1, strategist 1.05. Prose is bolder and more editorial while brand voice + hard rules keep it grounded.

### Prior build

- **Single-snapshot persistence.** Every new upload OVERWRITES the previously analysed dataset. The only cross-upload state retained is a tiny per-month KPI archive (`monthArchiveStore`), used solely for the Performance vs Previous Month comparison. If the active dataset spans only one month, MoM automatically falls back to the archive.
- **CPF (Cost per Follower gained)** added as a first-class metric — computed everywhere (headline KPI board, KPI table, MoM comparison, rankings, per-post column).
- **Nine rankings** across every page: Top by Engagement Rate, Reach, Saves, Shares, Views, and Lowest CPE / CPV / CPR / CPF (up from five).
- **Consulting-style Executive Summary** with five explicit sections: Key Wins ↑, Red Flags ↓, Content Gaps (Trends / Formats / Audience Signals not leveraged), Audience Insights (save-share behaviour, content preference signals, audience intent, timing, cadence, optimal posting), and a **Brutal Truth** paragraph in McKinsey / Bain / BCG voice.
- **Per-post AI Analysis** (`Performance → Analysis` tab, `/api/analysis`). For every post: why it worked, why it failed, audience behaviour triggered, supporting metrics, key learning, predictable future opportunity, recommended next iteration, verdict, and a confidence score. The tab also renders a Continue Doing / Stop Doing / Start Doing summary.
- **AI Verdict column** in the Posts table — one of `Scale Immediately / Repeat / Improve Hook / Reduce Frequency / Needs Better CTA / High Reach Low Engagement / High Saves / Evergreen / Weak Performer`, cached per-snapshot from `/api/analysis`.
- **20 brand-level Content Recommendations** (`Performance → Recommendations` tab, `/api/recommendations`), replacing the previous 15 Ideas. Of the 20, exactly seven are flagship recurring formats (Multi-brand styling edit, 5 Ways I Style, Investment Dressing, Luxury Education, Drop Reveal, Occasion Styling, Designer Access, Brand Craftsmanship, Celebrity-Inspired, Luxury Myths vs Facts). Every recommendation names brands from `brand-catalog.ts` and ties to a named live cultural signal. Refreshed once per IST calendar day.

## Data model — Total / Paid / Organic

Every KPI in the dashboard can be viewed three ways via the switcher at the top-right:

- **Organic** = Meta Business Suite export as reported.
- **Paid** = Meta Ads Manager export as reported.
- **Total** = Organic + Paid, per metric (verified additive on the sample month).

Where a metric only exists on one side (impressions on paid, likes on organic), the other side contributes 0. Where a post ran paid but no organic delivery is present in the Business Suite export, an anomaly banner appears in the Organic view — the number stays 0 rather than fabricated.

## Three-tier reporting

- **Daily** — always available. Post-level performance for the uploaded period.
- **Weekly** — available once posts span ≥ 5 days across 2 ISO weeks.
- **Monthly** — available once posts span ≥ 20 days across 2 calendar months.

Reports accumulate history across uploads (dedup by shortcode).

## Content taxonomy — 9 buckets

Every post is auto-classified into one of nine buckets:

1. Celebrity Campaigns
2. Exclusive Brand Launches
3. Lifestyle / Occasion Styling
4. Sale / Promotion Announcements
5. Product Catalogue Posts
6. UGC / Influencer Collaborations
7. Craftsmanship / Brand Stories
8. Pre-Owned Luxury Stories
9. Cultural / Seasonal Moments

Buckets ship with a High / Medium / Low / Missing verdict based on normalised avg saves + avg shares + ER.

## AI layer

Everything runs **ambient** — no buttons, no waiting for the user to click "generate". As soon as data is loaded, `AiProvider` triggers a single Gemini call per (snapshot, report level, model) tuple and caches the result in memory. `AiAnalyzing` shows a passive status line; `AiUsageSection` shows the token/cost footer.

### `/api/ai` — strategist
Runs on demand for the Executive Audit and per report level. Uses Google Search grounding. Cached per snapshot+level+model to avoid re-billing on tab switches. Now includes the consulting-style Executive Summary (Key Wins / Red Flags / Content Gaps / Audience Insights / Brutal Truth).

### `/api/analysis` — per-post AI reads
- Accepts a `{snapshotId, posts}` POST body.
- **Batched: 25 posts per Gemini call, up to 4 calls in parallel** — so a 100-post dataset is analysed in a single wall-clock pass (~30-60 seconds) with EVERY post getting an AI-authored read. No 40-post cap.
- Returns per-post analyses (why worked / why failed / audience behaviour / supporting metrics / key learning / predictable future opportunity / recommended next iteration / confidence score / verdict) plus a Continue Doing / Stop Doing / Start Doing summary merged across batches.
- **Deterministic fallback**: if Gemini omits or fails a post, `src/lib/verdict.ts` fills in a numeric read from the post's own metrics vs the dataset median, so the UI is never blank.
- **Cached per snapshot+mode+model** in memory so switching between the Analysis tab and the Posts tab (which shares the same cache to power the Verdict column) never re-bills.
- Grounded via Google Search so "why worked" reads reference concurrent cultural moments.

### `/api/recommendations` — 20 brand-level recommendations
- **Daily cache** keyed by IST calendar day — same day = same 20 recommendations.
- **In-flight de-dup** coalesces concurrent requests into a single Gemini call.
- **Live search enforced** across Vogue / BoF / WWD / Hypebeast / GQ / ELLE / Bazaar / Highsnobiety / Google Trends / Fashion Weeks / Watches & Wonders / celebrity news / Indian festivals.
- **Brand catalog enforced** — every recommendation names brands from `src/lib/brand-catalog.ts`.
- **Flagship recurring format rule** — exactly 7 of 20 must use one of the ten flagship structures.

### `/api/ideas` — legacy 15 High-Impact Content Ideas
Retained for backward compatibility. New code should use `/api/recommendations`.

## Brand catalog

`src/lib/brand-catalog.ts` is the single-file editable source of truth. When the official Tata CLiQ Luxury brand list is available, replace the `BRAND_CATALOG` array — every AI-generated idea will pick from the new list immediately with no other change required.

## Metrics reported vs not reported

Reported per-post from Meta exports:
- Reach, Views, Impressions, Likes, Saves, Shares, Comments, Interactions, Accounts Engaged, Profile Visits, Follows, ER%, VTR%, Spend, CPE, CPR, CPV, CTR, CPM, Duration.
- Derived: Watch Time (VTR × duration × views, weighted), Skip Rate (100 − VTR).

**Not reported** — surfaced as "requires account overview export" or "not in IG export":
- Gross Followers, Net Followers, Increase in Followers (need the account overview export, not the post export).
- Reposts (not in the Instagram export at all).

## Competitor tab

Links out to the Social Listener workspace at `https://sociallistener-xi.vercel.app/collections/…/pulse` for live competitor coverage.

## Reference

- `src/lib/schema.ts` — master column set + 9 ContentBucket constants
- `src/lib/view-mode.ts` — Total/Paid/Organic engine (additive model)
- `src/lib/view-metrics.ts` — view-mode-aware totals, bucket stats, format stats, rankings
- `src/lib/deltas.ts` — MoM/WoW/vs-previous-upload period bands
- `src/lib/ai/ideas.ts` — Ideas prompt + Gemini caller
- `src/app/api/ideas/route.ts` — IST daily cache + in-flight de-dup
- `src/lib/brand-catalog.ts` — editable brand seed
