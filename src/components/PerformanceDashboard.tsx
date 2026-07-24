"use client";
import React, { useMemo, useState } from "react";
import { fmtCompact, fmtCost, fmtCurrency, fmtInt, fmtPct } from "@/lib/normalize";
import type { ConsolidatedPost } from "@/lib/schema";
import { Card, DeltaBadge, Empty, Eyebrow, Pill, SectionTitle } from "./ui";
import { AiAnalyzing, AiUsageSection } from "./ai/AiControls";
import { AiOpportunities } from "./ai/AiSections";
import { CHART_CLARET, CHART_INK, TrendArea } from "./Charts";
import { toViewPosts, countAnomalies } from "@/lib/view-mode";
import type { ViewMode, ViewPost } from "@/lib/view-mode";
import { rankPosts, viewBucketStats, viewFormatStats, viewTotals, type RankBy } from "@/lib/view-metrics";
import { kpiDeltas, monthBands, weekBands } from "@/lib/deltas";
import { PostTable } from "./PostTable";
import { IdeasPanel } from "./IdeasPanel";

const COMPETITOR_URL = "https://sociallistener-xi.vercel.app/collections/cmrkx3lxv00007ohv1cg3mfey/pulse";

const SECTIONS = ["KPIs", "Trends", "Content", "Format", "Rankings", "Posts", "Ideas", "Competitors"] as const;
type Section = (typeof SECTIONS)[number];

const MODE_LABELS: Record<ViewMode, string> = { total: "Total", paid: "Paid", organic: "Organic" };

export function PerformanceDashboard({ posts, prev }: { posts: ConsolidatedPost[]; prev?: ConsolidatedPost[] }) {
  const [active, setActive] = useState<Section>("KPIs");
  const [mode, setMode] = useState<ViewMode>("total");

  const viewPosts = useMemo(() => toViewPosts(posts, mode), [posts, mode]);
  const prevPosts = useMemo(() => (prev ? toViewPosts(prev, mode) : null), [prev, mode]);
  const anomalies = useMemo(() => countAnomalies(posts), [posts]);

  return (
    <div className="fade-in">
      <nav className="sticky top-[57px] z-10 -mx-6 mb-6 border-b border-hairline bg-paper/85 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 overflow-x-auto">
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setActive(s)}
                className={`eyebrow whitespace-nowrap rounded-full px-3.5 py-1.5 transition-colors ${
                  active === s ? "bg-ink text-paper" : "text-slate hover:bg-veil"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1 rounded-full border border-line bg-surface p-0.5">
            {(["total", "paid", "organic"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`eyebrow rounded-full px-3.5 py-1.5 transition-colors ${
                  mode === m ? "bg-ink text-paper" : "text-slate hover:text-ink"
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <AiAnalyzing />

      {mode === "organic" && anomalies > 0 && (
        <Card className="mt-4 border-l-[3px] border-l-negative p-4 text-[12px] leading-relaxed text-graphite">
          <Eyebrow>Data note</Eyebrow>
          <p className="mt-1">
            {anomalies} post(s) ran paid but have no organic delivery in the Business Suite export — likely stale or
            mismatched dates. Their organic numbers show as 0 rather than a fabricated value.
          </p>
        </Card>
      )}

      <div className="mt-6">
        {active === "KPIs" && <KpisPane posts={viewPosts} prev={prevPosts} mode={mode} />}
        {active === "Trends" && <TrendsPane posts={viewPosts} />}
        {active === "Content" && <ContentPane posts={viewPosts} />}
        {active === "Format" && <FormatPane posts={viewPosts} />}
        {active === "Rankings" && <RankingsPane posts={viewPosts} />}
        {active === "Posts" && <PostTable posts={posts} />}
        {active === "Ideas" && (
          <div>
            <IdeasPanel />
            <AiOpportunities />
          </div>
        )}
        {active === "Competitors" && <CompetitorsPane />}
      </div>

      <AiUsageSection />
    </div>
  );
}

/* ------------------------- KPI PANE ------------------------- */
function KpisPane({ posts, prev, mode }: { posts: ViewPost[]; prev: ViewPost[] | null; mode: ViewMode }) {
  const monthly = useMemo(() => monthBands(posts), [posts]);
  const weekly = useMemo(() => weekBands(posts), [posts]);
  const t = viewTotals(posts);
  const prevMonthT = monthly.previous.length ? viewTotals(monthly.previous) : null;
  const prevWeekT = weekly.previous.length ? viewTotals(weekly.previous) : null;
  const uploadPrevT = prev ? viewTotals(prev) : null;

  // The five reference columns for each KPI row: current, MoM %, WoW %, vs previous upload %.
  const rows: {
    label: string;
    value: string;
    curNum: number | null;
    prevMonth: number | null;
    prevWeek: number | null;
    prevUpload: number | null;
    lowerIsBetter?: boolean;
    unavailable?: string;
  }[] = [
    { label: "Reach", value: fmtCompact(t.reach), curNum: t.reach, prevMonth: prevMonthT?.reach ?? null, prevWeek: prevWeekT?.reach ?? null, prevUpload: uploadPrevT?.reach ?? null },
    { label: "Views", value: fmtCompact(t.views), curNum: t.views, prevMonth: prevMonthT?.views ?? null, prevWeek: prevWeekT?.views ?? null, prevUpload: uploadPrevT?.views ?? null },
    { label: "Impressions", value: t.impressions ? fmtCompact(t.impressions) : "—", curNum: t.impressions || null, prevMonth: prevMonthT?.impressions ?? null, prevWeek: prevWeekT?.impressions ?? null, prevUpload: uploadPrevT?.impressions ?? null, unavailable: mode === "organic" ? "paid-only" : undefined },
    { label: "Engagement", value: fmtCompact(t.interactions), curNum: t.interactions, prevMonth: prevMonthT?.interactions ?? null, prevWeek: prevWeekT?.interactions ?? null, prevUpload: uploadPrevT?.interactions ?? null },
    { label: "Likes", value: t.likes ? fmtCompact(t.likes) : "—", curNum: t.likes || null, prevMonth: prevMonthT?.likes ?? null, prevWeek: prevWeekT?.likes ?? null, prevUpload: uploadPrevT?.likes ?? null, unavailable: mode === "paid" ? "aggregated in Engagement" : undefined },
    { label: "Saves", value: fmtInt(t.saves), curNum: t.saves, prevMonth: prevMonthT?.saves ?? null, prevWeek: prevWeekT?.saves ?? null, prevUpload: uploadPrevT?.saves ?? null },
    { label: "Shares", value: fmtInt(t.shares), curNum: t.shares, prevMonth: prevMonthT?.shares ?? null, prevWeek: prevWeekT?.shares ?? null, prevUpload: uploadPrevT?.shares ?? null },
    { label: "Comments", value: fmtInt(t.comments), curNum: t.comments, prevMonth: prevMonthT?.comments ?? null, prevWeek: prevWeekT?.comments ?? null, prevUpload: uploadPrevT?.comments ?? null },
    { label: "Reposts", value: "—", curNum: null, prevMonth: null, prevWeek: null, prevUpload: null, unavailable: "not in IG export" },
    { label: "Profile Activity", value: fmtInt(t.profileVisits), curNum: t.profileVisits, prevMonth: prevMonthT?.profileVisits ?? null, prevWeek: prevWeekT?.profileVisits ?? null, prevUpload: uploadPrevT?.profileVisits ?? null },
    { label: "Follows (from posts)", value: fmtInt(t.follows), curNum: t.follows, prevMonth: prevMonthT?.follows ?? null, prevWeek: prevWeekT?.follows ?? null, prevUpload: uploadPrevT?.follows ?? null },
    { label: "Gross Followers", value: "—", curNum: null, prevMonth: null, prevWeek: null, prevUpload: null, unavailable: "needs account overview export" },
    { label: "Net Followers", value: "—", curNum: null, prevMonth: null, prevWeek: null, prevUpload: null, unavailable: "needs account overview export" },
    { label: "Increase in Followers", value: "—", curNum: null, prevMonth: null, prevWeek: null, prevUpload: null, unavailable: "needs account overview export" },
    { label: "Actual Spend", value: fmtCurrency(t.spend), curNum: t.spend, prevMonth: prevMonthT?.spend ?? null, prevWeek: prevWeekT?.spend ?? null, prevUpload: uploadPrevT?.spend ?? null },
    { label: "Spend (Lakhs)", value: `₹${t.spendLakhs.toFixed(2)}L`, curNum: t.spendLakhs, prevMonth: prevMonthT?.spendLakhs ?? null, prevWeek: prevWeekT?.spendLakhs ?? null, prevUpload: uploadPrevT?.spendLakhs ?? null },
    { label: "ER%", value: fmtPct(t.er, 3), curNum: t.er, prevMonth: prevMonthT?.er ?? null, prevWeek: prevWeekT?.er ?? null, prevUpload: uploadPrevT?.er ?? null },
    { label: "CPE", value: fmtCost(t.cpe), curNum: t.cpe, prevMonth: prevMonthT?.cpe ?? null, prevWeek: prevWeekT?.cpe ?? null, prevUpload: uploadPrevT?.cpe ?? null, lowerIsBetter: true },
    { label: "CPR", value: fmtCost(t.cpr), curNum: t.cpr, prevMonth: prevMonthT?.cpr ?? null, prevWeek: prevWeekT?.cpr ?? null, prevUpload: uploadPrevT?.cpr ?? null, lowerIsBetter: true },
    { label: "CPV", value: fmtCost(t.cpv), curNum: t.cpv, prevMonth: prevMonthT?.cpv ?? null, prevWeek: prevWeekT?.cpv ?? null, prevUpload: uploadPrevT?.cpv ?? null, lowerIsBetter: true },
    { label: "CTR", value: fmtPct(t.ctr, 3), curNum: t.ctr, prevMonth: prevMonthT?.ctr ?? null, prevWeek: prevWeekT?.ctr ?? null, prevUpload: uploadPrevT?.ctr ?? null },
    { label: "Avg Watch Time", value: t.avgWatchSeconds != null ? `${t.avgWatchSeconds.toFixed(1)}s` : "—", curNum: t.avgWatchSeconds, prevMonth: prevMonthT?.avgWatchSeconds ?? null, prevWeek: prevWeekT?.avgWatchSeconds ?? null, prevUpload: uploadPrevT?.avgWatchSeconds ?? null },
    { label: "Skip Rate", value: t.skipRate != null ? `${t.skipRate.toFixed(1)}%` : "—", curNum: t.skipRate, prevMonth: prevMonthT?.skipRate ?? null, prevWeek: prevWeekT?.skipRate ?? null, prevUpload: uploadPrevT?.skipRate ?? null, lowerIsBetter: true },
  ];

  return (
    <section>
      <SectionTitle
        eyebrow={`${MODE_LABELS[mode]} view · every KPI in the consolidated sheet`}
        title="The full board"
        hint="Month-over-month, week-over-week and vs previous upload for every KPI. Trend arrows follow whether higher or lower is better."
      />
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-3"><Eyebrow>KPI</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Current</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>MoM %</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>WoW %</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>vs Prev upload</Eyebrow></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-hairline last:border-0">
                <td className="px-4 py-2.5 text-[13px] text-ink">
                  {r.label}
                  {r.unavailable && <span className="ml-2 text-[10px] text-mist">· {r.unavailable}</span>}
                </td>
                <td className="tabular px-3 py-2.5 text-right text-[13px] text-ink">{r.value}</td>
                <td className="px-3 py-2.5 text-right"><DeltaCell cur={r.curNum} prev={r.prevMonth} lowerIsBetter={r.lowerIsBetter} /></td>
                <td className="px-3 py-2.5 text-right"><DeltaCell cur={r.curNum} prev={r.prevWeek} lowerIsBetter={r.lowerIsBetter} /></td>
                <td className="px-3 py-2.5 text-right"><DeltaCell cur={r.curNum} prev={r.prevUpload} lowerIsBetter={r.lowerIsBetter} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

function DeltaCell({ cur, prev, lowerIsBetter }: { cur: number | null; prev: number | null; lowerIsBetter?: boolean }) {
  if (cur == null || prev == null) return <span className="tabular text-[12px] text-mist">—</span>;
  if (prev === 0) return <span className="tabular text-[12px] text-mist">—</span>;
  const pct = ((cur - prev) / prev) * 100;
  const good = lowerIsBetter ? pct < 0 : pct > 0;
  const cls = pct === 0 ? "text-mist" : good ? "text-positive" : "text-negative";
  return <span className={`tabular text-[12px] ${cls}`}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</span>;
}

/* ------------------------- TRENDS PANE ------------------------- */
function weeklySeries(posts: ViewPost[]) {
  const map = new Map<string, { reach: number; views: number; eng: number; spend: number; follows: number; er_num: number; er_den: number }>();
  for (const p of posts) {
    if (!p.publishTime) continue;
    const d = new Date(p.publishTime);
    if (isNaN(d.getTime())) continue;
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
    const key = `W${String(week).padStart(2, "0")}`;
    const cur = map.get(key) ?? { reach: 0, views: 0, eng: 0, spend: 0, follows: 0, er_num: 0, er_den: 0 };
    cur.reach += p.reach ?? 0;
    cur.views += p.views ?? 0;
    cur.eng += p.interactions ?? 0;
    cur.spend += p.spend ?? 0;
    cur.follows += p.follows ?? 0;
    cur.er_num += p.interactions ?? 0;
    cur.er_den += p.reach ?? 0;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, v]) => ({ week, reach: v.reach, views: v.views, eng: v.eng, spend: v.spend, follows: v.follows, er: v.er_den ? (v.er_num / v.er_den) * 100 : 0 }));
}

function TrendsPane({ posts }: { posts: ViewPost[] }) {
  const series = useMemo(() => weeklySeries(posts), [posts]);
  const [metric, setMetric] = useState<"reach" | "views" | "eng" | "spend" | "follows" | "er">("reach");
  const labels: Record<string, string> = { reach: "Reach", views: "Views", eng: "Engagement", spend: "Spend", follows: "Follows", er: "ER%" };
  if (series.length < 2) return <Empty title="Trends need more than one week of posts" body="Once the dataset spans multiple weeks, week-over-week curves appear here." />;
  return (
    <section>
      <SectionTitle eyebrow="Weekly Trends" title="Momentum over time" hint="How each headline metric moves week by week." />
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>Week over week</Eyebrow>
          <div className="flex flex-wrap gap-1">
            {(["reach", "views", "eng", "spend", "follows", "er"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`eyebrow rounded-full border px-3 py-1 transition-colors ${
                  metric === m ? "border-ink bg-ink text-paper" : "border-line text-slate hover:border-graphite"
                }`}
              >
                {labels[m]}
              </button>
            ))}
          </div>
        </div>
        <TrendArea data={series} xKey="week" yKey={metric} color={metric === "spend" ? CHART_CLARET : CHART_INK} height={260} />
      </Card>
    </section>
  );
}

/* ------------------------- CONTENT PANE ------------------------- */
function ContentPane({ posts }: { posts: ViewPost[] }) {
  const stats = useMemo(() => viewBucketStats(posts), [posts]);
  return (
    <section>
      <SectionTitle
        eyebrow="Content Analysis"
        title="Nine buckets, ranked"
        hint="Every bucket in the TCL content taxonomy — reach, views, likes, saves, engagement and ER, with a High / Medium / Low / Missing verdict. AI Verdict and Next Action populate from the strategist analysis."
      />
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-3"><Eyebrow>Bucket</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Posts</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Reach</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Views</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Likes</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Saves</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Eng.</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>ER %</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Verdict</Eyebrow></th>
            </tr>
          </thead>
          <tbody>
            {stats.map((r) => {
              const tone = r.performance === "High" ? "win" : r.performance === "Low" ? "risk" : r.performance === "Missing" ? "default" : "accent";
              return (
                <tr key={r.bucket} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 text-[13px] font-medium text-ink">{r.bucket}</td>
                  <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{r.posts}</td>
                  <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{fmtCompact(r.reach)}</td>
                  <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{fmtCompact(r.views)}</td>
                  <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{fmtInt(r.likes)}</td>
                  <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{fmtInt(r.saves)}</td>
                  <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{fmtCompact(r.interactions)}</td>
                  <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{fmtPct(r.er, 2)}</td>
                  <td className="px-3 py-3 text-right"><Pill tone={tone}>{r.performance}</Pill></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <p className="mt-3 text-[12px] leading-relaxed text-slate">
        AI Verdict and Next Action are authored by the strategist agent in the <em>What Worked</em>, <em>What Didn't Work</em> and <em>Where to Act Next</em>
        sections of the Executive Audit, so recommendations reference actual bucket performance and don't repeat here.
      </p>
    </section>
  );
}

/* ------------------------- FORMAT PANE ------------------------- */
function FormatPane({ posts }: { posts: ViewPost[] }) {
  const stats = useMemo(() => viewFormatStats(posts), [posts]);
  return (
    <section>
      <SectionTitle eyebrow="Format Analysis" title="Reels · Carousels · Static · Stories" />
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-3"><Eyebrow>Format</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Posts</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Avg Reach</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Avg Views</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Avg Saves</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>ER %</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Watch Time</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Skip Rate</Eyebrow></th>
            </tr>
          </thead>
          <tbody>
            {stats.map((f) => (
              <tr key={f.format} className="border-b border-hairline last:border-0">
                <td className="px-4 py-3 text-[13px] font-medium text-ink">{f.format}</td>
                <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{f.posts}</td>
                <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{fmtCompact(f.avgReach)}</td>
                <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{fmtCompact(f.avgViews)}</td>
                <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{fmtInt(f.avgSaves)}</td>
                <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{fmtPct(f.er, 2)}</td>
                <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{f.avgWatchSeconds != null ? `${f.avgWatchSeconds.toFixed(1)}s` : "—"}</td>
                <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{f.skipRate != null ? `${f.skipRate.toFixed(1)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

/* ------------------------- RANKINGS PANE ------------------------- */
function RankingsPane({ posts }: { posts: ViewPost[] }) {
  const groups: { title: string; by: RankBy; extract: (p: ViewPost) => string }[] = [
    { title: "Lowest CPR", by: "cpr", extract: (p) => (p.cpr != null ? `₹${p.cpr.toFixed(3)}` : "—") },
    { title: "Highest ER", by: "er", extract: (p) => fmtPct(p.er, 2) },
    { title: "Highest Views", by: "views", extract: (p) => fmtCompact(p.views ?? 0) },
    { title: "Highest Reach", by: "reach", extract: (p) => fmtCompact(p.reach ?? 0) },
    { title: "Highest Followers Generated", by: "follows", extract: (p) => fmtInt(p.follows ?? 0) },
  ];
  return (
    <section>
      <SectionTitle
        eyebrow="Rankings"
        title="Top performers by five criteria"
        hint="Cost efficiency, engagement depth, discovery, distribution and acquisition — surfaced side by side."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <Card key={g.by} className="p-5">
            <Eyebrow className="mb-3">{g.title}</Eyebrow>
            <ol className="space-y-2.5">
              {rankPosts(posts, g.by, 5).map((p, i) => (
                <li key={p.shortcode + i} className="flex gap-3 border-b border-hairline pb-2.5 last:border-0 last:pb-0">
                  <span className="tabular mt-0.5 shrink-0 text-[11px] text-mist">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <a href={p.postLink} target="_blank" rel="noreferrer" className="line-clamp-2 text-[12px] leading-tight text-ink hover:text-claret hover:underline">
                      {p.description || p.shortcode}
                    </a>
                    <div className="mt-0.5 text-[10px] text-mist">{p.format} · {p.contentBucket}</div>
                  </div>
                  <span className="tabular shrink-0 text-[12px] text-graphite">{g.extract(p)}</span>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CompetitorsPane() {
  return (
    <section>
      <SectionTitle
        eyebrow="Competitive Intelligence"
        title="Competitor social listening"
        hint="Live competitor tracking (Myntra, AJIO, Nykaa) runs in the Social Listener workspace."
      />
      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="max-w-md text-[13px] leading-relaxed text-graphite">
          Open the Social Listener pulse to compare share of voice, content cadence and audience reaction against the competitive set in real time.
        </p>
        <a
          href={COMPETITOR_URL}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-full bg-ink px-5 py-2.5 text-[12px] font-medium text-paper hover:opacity-90"
        >
          Open Social Listener ↗
        </a>
      </Card>
    </section>
  );
}
