"use client";
import React, { useMemo } from "react";
import { downloadWorkbook } from "@/lib/excel";
import { executiveSummary } from "@/lib/insights";
import { fmtCompact, fmtCost, fmtCurrency, fmtInt, fmtPct } from "@/lib/normalize";
import type { ConsolidatedPost } from "@/lib/schema";
import { Card, Eyebrow, SectionTitle } from "./ui";
import { AiAnalyzing, AiUsageSection } from "./ai/AiControls";
import {
  AiExecutiveNarrative,
  AiConsultingKeyWins,
  AiConsultingRedFlags,
  AiConsultingContentGaps,
  AiConsultingAudience,
  AiConsultingBrutalTruth,
  AiWhatWorked,
  AiWhatDidntWork,
  AiWhereToActNext,
  AiImprovements,
  AiStrategicPriorities,
  AiRisks,
  AiGrowthLevers,
  AiOpportunities,
} from "./ai/AiSections";
import { toViewPosts } from "@/lib/view-mode";
import type { ViewPost } from "@/lib/view-mode";
import { viewTotals, rankPosts, type RankBy } from "@/lib/view-metrics";
import { kpiDeltas, monthBands } from "@/lib/deltas";
import type { KpiSnapshot } from "@/lib/store";

export function ExecutiveAudit({ posts, label, archive = [] }: { posts: ConsolidatedPost[]; label: string; archive?: KpiSnapshot[] }) {
  const summary = executiveSummary(posts);
  const totalView = useMemo(() => toViewPosts(posts, "total"), [posts]);
  const totals = useMemo(() => viewTotals(totalView), [totalView]);
  const bands = useMemo(() => monthBands(totalView), [totalView]);

  // Prefer within-dataset previous month; fall back to the archive (the only cross-upload data).
  const curTotals = useMemo(() => viewTotals(bands.current.length ? bands.current : totalView), [bands, totalView]);
  const prevWithinData = bands.previous.length ? viewTotals(bands.previous) : null;
  const archivePrev = useMemo<KpiSnapshot | null>(() => {
    if (prevWithinData) return null; // dataset already provides prev month
    if (!bands.currentLabel || bands.currentLabel === "—") return archive.length ? archive[archive.length - 2] ?? null : null;
    const idx = archive.findIndex((a) => a.monthLabel === bands.currentLabel);
    if (idx > 0) return archive[idx - 1];
    // The current month wasn't in the archive yet — use the most recent archived month.
    return archive.length ? archive[archive.length - 1] : null;
  }, [prevWithinData, archive, bands.currentLabel]);

  const prevTotals = useMemo(() => {
    if (prevWithinData) return prevWithinData;
    if (!archivePrev) return null;
    // Cast the archived KpiSnapshot back into a partial ViewTotals shape kpiDeltas can read.
    return {
      posts: archivePrev.posts,
      reach: archivePrev.reach,
      views: archivePrev.views,
      impressions: archivePrev.impressions,
      likes: archivePrev.likes,
      saves: archivePrev.saves,
      shares: archivePrev.shares,
      comments: archivePrev.comments,
      interactions: archivePrev.interactions,
      follows: archivePrev.follows,
      profileVisits: 0,
      spend: archivePrev.spend,
      spendLakhs: archivePrev.spend / 100000,
      er: archivePrev.er,
      cpr: archivePrev.cpr,
      cpv: archivePrev.cpv,
      cpe: archivePrev.cpe,
      cpf: archivePrev.cpf,
      ctr: null,
      avgWatchSeconds: null,
      skipRate: null,
    };
  }, [prevWithinData, archivePrev]);

  const deltas = useMemo(() => kpiDeltas(curTotals, prevTotals), [curTotals, prevTotals]);

  const prevMonthLabel = prevWithinData ? bands.previousLabel : archivePrev?.monthLabel ?? "—";

  // Cover KPI band — includes CPF per the brief.
  const kpis: [string, string, string?][] = [
    ["Reach", fmtCompact(totals.reach)],
    ["Impressions", totals.impressions ? fmtCompact(totals.impressions) : "—"],
    ["ER", fmtPct(totals.er, 2)],
    ["Followers Gained", fmtInt(totals.follows), "post-attributed"],
    ["CPE", fmtCost(totals.cpe)],
    ["CPV", fmtCost(totals.cpv)],
    ["CPR", fmtCost(totals.cpr)],
    ["CPF", fmtCost(totals.cpf)],
    ["Saves", fmtInt(totals.saves)],
    ["Shares", fmtInt(totals.shares)],
    ["Video Views", fmtCompact(totals.views)],
    ["Total Engagement", fmtCompact(totals.interactions)],
  ];

  return (
    <div className="fade-in">
      {/* Cover */}
      <Card className="overflow-hidden">
        <div className="border-b border-hairline bg-[linear-gradient(180deg,#FFFFFF,#FAF9F6)] px-8 py-9">
          <div className="flex items-start justify-between gap-6">
            <div>
              <Eyebrow>Executive Audit · Confidential</Eyebrow>
              <h1 className="display mt-3 text-[30px] font-medium leading-tight text-ink md:text-[38px]">
                Instagram Performance Review
              </h1>
              <p className="mt-2 text-[13px] text-slate">
                Tata CLiQ Luxury · Reporting period <span className="tabular text-ink">{label}</span>
              </p>
            </div>
            <button
              onClick={() => downloadWorkbook(posts, label)}
              className="shrink-0 rounded-full border border-ink bg-ink px-5 py-2.5 text-[12px] font-medium text-paper hover:opacity-90"
            >
              Download report ↓
            </button>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {kpis.map(([k, v, note]) => (
              <div key={k} className="border-l border-hairline pl-4 first:border-l-0 first:pl-0 sm:border-l sm:pl-4 sm:first:border-l-0">
                <Eyebrow>{k}</Eyebrow>
                <div className="tabular mt-2 text-[18px] font-medium text-ink">{v}</div>
                {note && <div className="mt-0.5 text-[10px] text-mist">{note}</div>}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-6">
        <AiAnalyzing />
      </div>

      {/* Month-over-Month comparison */}
      <div className="mt-8">
        <SectionTitle
          eyebrow={prevTotals ? `${bands.currentLabel !== "—" ? bands.currentLabel : "Current period"} vs ${prevMonthLabel}${!prevWithinData && archivePrev ? " · from archive" : ""}` : "Performance vs Previous Month"}
          title="Performance vs previous month"
          hint={prevTotals
            ? "Growth, spend and efficiency deltas across every headline KPI. Values pulled from the month archive when the dataset only spans one month."
            : "Only one month of data available — upload a prior period to seed the archive, or upload a dataset spanning multiple months."}
        />
        <AiExecutiveNarrative />
        <MoMTable deltas={deltas} />
      </div>

      {/* Consulting-style Executive Summary */}
      <AiConsultingKeyWins />
      <AiConsultingRedFlags />
      <AiConsultingContentGaps />
      <AiConsultingAudience />
      <AiConsultingBrutalTruth />

      {/* Top performers — nine rankings including CPF */}
      <div className="mt-12">
        <SectionTitle
          eyebrow="Top Performing Posts"
          title="Ranked nine ways"
          hint="Cost, engagement, discovery, distribution and acquisition — surfaced side by side."
        />
        <TopRankings posts={totalView} />
      </div>

      {/* AI strategist findings (five-question analysis) */}
      <AiWhatWorked />
      <AiWhatDidntWork />
      <AiWhereToActNext />
      <AiImprovements />
      <AiStrategicPriorities />
      <AiRisks />
      <AiGrowthLevers />
      <AiOpportunities />

      <AiUsageSection />
    </div>
  );
}

/* ------------ MoM comparison table ------------ */
function MoMTable({ deltas }: { deltas: ReturnType<typeof kpiDeltas> }) {
  function fmt(kind: string, n: number | null): string {
    if (n == null) return "—";
    switch (kind) {
      case "compact": return fmtCompact(n);
      case "currency": return fmtCurrency(n);
      case "pct": return fmtPct(n, 2);
      case "cost": return fmtCost(n);
      case "int": return fmtInt(n);
      default: return String(n);
    }
  }
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-line">
            <th className="px-4 py-3"><Eyebrow>KPI</Eyebrow></th>
            <th className="px-3 py-3 text-right"><Eyebrow>Current</Eyebrow></th>
            <th className="px-3 py-3 text-right"><Eyebrow>Previous</Eyebrow></th>
            <th className="px-3 py-3 text-right"><Eyebrow>Difference</Eyebrow></th>
            <th className="px-3 py-3 text-right"><Eyebrow>% Growth</Eyebrow></th>
            <th className="px-3 py-3 text-center"><Eyebrow>Trend</Eyebrow></th>
          </tr>
        </thead>
        <tbody>
          {deltas.map((d) => {
            const good = d.changePct == null ? null : d.lowerIsBetter ? d.changePct < 0 : d.changePct > 0;
            const cls = good == null ? "text-mist" : good ? "text-positive" : "text-negative";
            const diff = d.current == null || d.previous == null ? null : d.current - d.previous;
            const arrow = d.changePct == null ? "—" : d.changePct > 0 ? "↑" : d.changePct < 0 ? "↓" : "→";
            return (
              <tr key={d.key} className="border-b border-hairline last:border-0">
                <td className="px-4 py-3 text-[13px] font-medium text-ink">{d.label}</td>
                <td className="tabular px-3 py-3 text-right text-[13px] text-ink">{fmt(d.format, d.current)}</td>
                <td className="tabular px-3 py-3 text-right text-[13px] text-slate">{fmt(d.format, d.previous)}</td>
                <td className={`tabular px-3 py-3 text-right text-[13px] ${cls}`}>{diff == null ? "—" : `${diff >= 0 ? "+" : ""}${fmt(d.format, Math.abs(diff))}`}</td>
                <td className={`tabular px-3 py-3 text-right text-[13px] ${cls}`}>
                  {d.changePct == null ? "—" : `${d.changePct >= 0 ? "+" : ""}${d.changePct.toFixed(1)}%`}
                </td>
                <td className={`px-3 py-3 text-center text-[15px] ${cls}`}>{arrow}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

/* ------------ Rankings ------------ */
function TopRankings({ posts }: { posts: ViewPost[] }) {
  const groups: { title: string; by: RankBy; extract: (p: ViewPost) => string }[] = [
    { title: "Top by Engagement Rate", by: "er", extract: (p) => fmtPct(p.er, 2) },
    { title: "Top by Reach", by: "reach", extract: (p) => fmtCompact(p.reach ?? 0) },
    { title: "Top by Saves", by: "saves", extract: (p) => fmtInt(p.saves ?? 0) },
    { title: "Top by Shares", by: "shares", extract: (p) => fmtInt(p.shares ?? 0) },
    { title: "Top by Views", by: "views", extract: (p) => fmtCompact(p.views ?? 0) },
    { title: "Lowest CPE", by: "cpe", extract: (p) => fmtCost(p.cpe) },
    { title: "Lowest CPV", by: "cpv", extract: (p) => fmtCost(p.cpv) },
    { title: "Lowest CPR", by: "cpr", extract: (p) => fmtCost(p.cpr) },
    { title: "Lowest CPF (best follower economics)", by: "cpf", extract: (p) => {
        if (!p.spend || !p.follows) return "—";
        return fmtCost(p.spend / p.follows);
      } },
  ];
  return (
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
  );
}
