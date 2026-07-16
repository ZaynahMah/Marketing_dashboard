"use client";
import React from "react";
import { downloadWorkbook } from "@/lib/excel";
import { executiveSummary, strategicInsights } from "@/lib/insights";
import type { Insight } from "@/lib/insights";
import { fmtCompact, fmtCurrency, fmtInt, fmtPct } from "@/lib/normalize";
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
  const t = summary.totals;

  const cover = [
    ["Total Spend", fmtCurrency(t.spend)],
    ["Total Reach", fmtCompact(t.reach)],
    ["Total Views", fmtCompact(t.views)],
    ["Engagement", fmtCompact(t.interactions)],
    ["Followers", fmtCompact(t.follows)],
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
          <div className="mt-8 grid grid-cols-2 gap-y-6 sm:grid-cols-5">
            {cover.map(([k, v]) => (
              <div key={k} className="border-l border-hairline pl-4 first:border-l-0 first:pl-0 sm:border-l sm:pl-4 sm:first:border-l-0">
                <Eyebrow>{k}</Eyebrow>
                <div className="tabular mt-2 text-[22px] font-medium text-ink">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* AI runs automatically; this is a passive status line only */}
      <div className="mt-6">
        <AiAnalyzing />
      </div>

      {/* Executive summary */}
      <div className="mt-6">
        <SectionTitle
          eyebrow="Executive Summary"
          title="What leadership needs to know"
          hint="The read on this period — grounded in the numbers below."
        />
        <AiExecutiveNarrative />
        <div className="grid gap-4 md:grid-cols-2">
          <SummaryCard tone="win" k="Biggest win" v={summary.biggestWin} />
          <SummaryCard tone="accent" k="Biggest opportunity" v={summary.biggestOpportunity} />
          <SummaryCard tone="win" k="Best campaign" v={summary.bestCampaign} />
          <SummaryCard tone="risk" k="Weakest campaign" v={summary.weakestCampaign} />
          <SummaryCard k="Overall content health" v={summary.contentHealth} />
          <SummaryCard k="Paid efficiency" v={summary.paidSummary} sub={summary.organicSummary} />
        </div>
      </div>

      {/* Strategist sections — embedded automatically where AI adds judgement */}
      <AiWhatWorked />
      <AiWhatDidntWork />
      <AiWhereToActNext />
      <AiImprovements />
      <AiStrategicPriorities />
      <AiRisks />
      <AiGrowthLevers />
      <AiOpportunities />

      {/* Deterministic strategic insights (always present, even without a key) */}
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
          {insights.length === 0 && (
            <p className="text-[13px] text-slate">Upload more posts to surface strategic patterns.</p>
          )}
        </div>
      </div>

      {/* Token usage (informational) */}
      <AiUsageSection />
    </div>
  );
}

function SummaryCard({
  k,
  v,
  sub,
  tone = "default",
}: {
  k: string;
  v: string;
  sub?: string;
  tone?: "default" | "win" | "risk" | "accent";
}) {
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
