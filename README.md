# Tata CLiQ Luxury — Social Intelligence Dashboard

Internal, confidential. Next.js 14 (App Router) + TypeScript. Deploys to Vercel.

## Deploy

1. Push to GitHub, import to Vercel.
2. Add env vars in Vercel:
   - `GEMINI_API_KEY` — required for the AI strategist and the daily Ideas endpoint.
   - `GEMINI_MODEL` — optional (defaults to `gemini-2.5-flash`).
3. Deploy.

That's the whole setup. The homepage takes uploads; everything else is client-side (persisted in IndexedDB) except the two AI endpoints.

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
Runs on demand for the Executive Audit and per report level. Uses Google Search grounding. Cached per snapshot+level+model to avoid re-billing on tab switches.

### `/api/ideas` — 15 High-Impact Content Ideas
- **Daily cache** keyed by IST calendar day — same day = same 15 ideas, no matter how many times the page loads.
- **In-flight de-dup** coalesces concurrent requests into a single Gemini call.
- **Live search enforced** across Vogue / BoF / WWD / Hypebeast / GQ / ELLE / Bazaar / Highsnobiety / Google Trends / Fashion Weeks / Watches & Wonders / celebrity news / Indian festivals.
- **Brand catalog enforced** — every idea uses only brands present in `src/lib/brand-catalog.ts`.
- **Forbidden-phrase list** in the prompt rejects generic AI advice ("Post more Reels", "leverage", "authentic storytelling", etc.).

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
