"use client";
import React, { useMemo } from "react";
import { downloadWorkbook } from "@/lib/excel";
import { executiveSummary, strategicInsights } from "@/lib/insights";
import type { Insight } from "@/lib/insights";
import { fmtCompact, fmtCost, fmtCurrency, fmtInt, fmtPct } from "@/lib/normalize";
import type { ConsolidatedPost } from "@/lib/schema";
import { Card, Eyebrow, Pill, SectionTitle } from "./ui";
import { AiAnalyzing, AiUsageSection } from "./ai/AiControls";
import {
  AiExecutiveNarrative,
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

const KIND_TONE: Record<Insight["kind"], "win" | "risk" | "accent" | "default"> = {
  win: "win",
  risk: "risk",
  opportunity: "accent",
  efficiency: "default",
  brand: "accent",
};

export function ExecutiveAudit({ posts, label }: { posts: ConsolidatedPost[]; label: string }) {
  const summary = executiveSummary(posts);
  const insights = strategicInsights(posts);
  const totalView = useMemo(() => toViewPosts(posts, "total"), [posts]);
  const totals = useMemo(() => viewTotals(totalView), [totalView]);
  const bands = useMemo(() => monthBands(totalView), [totalView]);
  const curTotals = useMemo(() => viewTotals(bands.current.length ? bands.current : totalView), [bands, totalView]);
  const prevTotals = useMemo(() => (bands.previous.length ? viewTotals(bands.previous) : null), [bands]);
  const deltas = useMemo(() => kpiDeltas(curTotals, prevTotals), [curTotals, prevTotals]);

  // Front-page KPI band — the four requested (ER, CPE, CPR, CPV) foregrounded.
  const kpis: [string, string, string?][] = [
    ["Total Spend", fmtCurrency(totals.spend)],
    ["Total Reach", fmtCompact(totals.reach)],
    ["Total Views", fmtCompact(totals.views)],
    ["Engagement", fmtCompact(totals.interactions)],
    ["Followers", fmtCompact(totals.follows), "requires account overview export"],
    ["ER", fmtPct(totals.er, 2)],
    ["CPE", fmtCost(totals.cpe)],
    ["CPR", fmtCost(totals.cpr)],
    ["CPV", fmtCost(totals.cpv)],
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
          <div className="mt-8 grid grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map(([k, v, note]) => (
              <div key={k} className="border-l border-hairline pl-4 first:border-l-0 first:pl-0 sm:border-l sm:pl-4 sm:first:border-l-0">
                <Eyebrow>{k}</Eyebrow>
                <div className="tabular mt-2 text-[20px] font-medium text-ink">{v}</div>
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
          eyebrow={prevTotals ? `${bands.currentLabel} vs ${bands.previousLabel}` : "Executive Summary"}
          title="Performance vs previous month"
          hint={prevTotals ? "Growth, spend and efficiency deltas across every headline KPI." : "Only one month of data available — upload a prior period to unlock month-over-month deltas."}
        />
        <AiExecutiveNarrative />
        <MoMTable deltas={deltas} />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SummaryCard tone="win" k="Biggest win" v={summary.biggestWin} />
          <SummaryCard tone="accent" k="Biggest opportunity" v={summary.biggestOpportunity} />
          <SummaryCard tone="win" k="Best campaign" v={summary.bestCampaign} />
          <SummaryCard tone="risk" k="Weakest campaign" v={summary.weakestCampaign} />
          <SummaryCard k="Overall content health" v={summary.contentHealth} />
          <SummaryCard k="Paid efficiency" v={summary.paidSummary} sub={summary.organicSummary} />
        </div>
      </div>

      {/* Top performers — five rankings */}
      <div className="mt-12">
        <SectionTitle
          eyebrow="Top Performing Posts"
          title="Ranked five ways"
          hint="What did the best work by the metric that matters — cost, engagement, discovery, distribution, acquisition."
        />
        <TopFiveRankings posts={totalView} />
      </div>

      {/* AI strategist sections */}
      <AiWhatWorked />
      <AiWhatDidntWork />
      <AiWhereToActNext />
      <AiImprovements />
      <AiStrategicPriorities />
      <AiRisks />
      <AiGrowthLevers />
      <AiOpportunities />

      {/* Deterministic signal check */}
      <div className="mt-12">
        <SectionTitle eyebrow="Signal Check" title="Deterministic wins, risks & opportunities" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((ins, i) => (
            <Card key={i} className="flex flex-col p-5">
              <div className="mb-3 flex items-center justify-between">
                <Pill tone={KIND_TONE[ins.kind]}>{ins.kind}</Pill>
                {ins.metric && <span className="tabular text-[12px] text-slate">{ins.metric}</span>}
              </div>
              <h3 className="display text-[16px] font-medium text-ink">{ins.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-graphite">{ins.body}</p>
            </Card>
          ))}
          {insights.length === 0 && <p className="text-[13px] text-slate">Upload more posts to surface strategic patterns.</p>}
        </div>
      </div>

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
            <th className="px-3 py-3 text-right"><Eyebrow>Change</Eyebrow></th>
          </tr>
        </thead>
        <tbody>
          {deltas.map((d) => {
            const good = d.changePct == null ? null : d.lowerIsBetter ? d.changePct < 0 : d.changePct > 0;
            const cls = good == null ? "text-mist" : good ? "text-positive" : "text-negative";
            return (
              <tr key={d.key} className="border-b border-hairline last:border-0">
                <td className="px-4 py-3 text-[13px] font-medium text-ink">{d.label}</td>
                <td className="tabular px-3 py-3 text-right text-[13px] text-ink">{fmt(d.format, d.current)}</td>
                <td className="tabular px-3 py-3 text-right text-[13px] text-slate">{fmt(d.format, d.previous)}</td>
                <td className={`tabular px-3 py-3 text-right text-[13px] ${cls}`}>
                  {d.changePct == null ? "—" : `${d.changePct >= 0 ? "+" : ""}${d.changePct.toFixed(1)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

/* ------------ Top 5 rankings ------------ */
function TopFiveRankings({ posts }: { posts: ViewPost[] }) {
  const groups: { title: string; by: RankBy; extract: (p: ViewPost) => string }[] = [
    { title: "Lowest CPR", by: "cpr", extract: (p) => (p.cpr != null ? `₹${p.cpr.toFixed(3)}` : "—") },
    { title: "Highest ER", by: "er", extract: (p) => fmtPct(p.er, 2) },
    { title: "Highest Views", by: "views", extract: (p) => fmtCompact(p.views ?? 0) },
    { title: "Highest Reach", by: "reach", extract: (p) => fmtCompact(p.reach ?? 0) },
    { title: "Highest Followers Generated", by: "follows", extract: (p) => fmtInt(p.follows ?? 0) },
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
                  <a
                    href={p.postLink}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-2 text-[12px] leading-tight text-ink hover:text-claret hover:underline"
                  >
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

function SummaryCard({
  k, v, sub, tone = "default",
}: { k: string; v: string; sub?: string; tone?: "default" | "win" | "risk" | "accent" }) {
  const accent: Record<string, string> = {
    default: "border-line",
    win: "border-l-[3px] border-l-positive",
    risk: "border-l-[3px] border-l-negative",
    accent: "border-l-[3px] border-l-claret",
  };
  return (
    <Card className={`p-5 ${accent[tone]}`}>
      <Eyebrow>{k}</Eyebrow>
      <p className="mt-2.5 text-[14px] leading-relaxed text-ink">{v}</p>
      {sub && <p className="mt-2 text-[12px] leading-relaxed text-slate">{sub}</p>}
    </Card>
  );
}
