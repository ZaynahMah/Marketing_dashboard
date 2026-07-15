"use client";
import React from "react";
import { useAi } from "./AiProvider";
import { recommendations as deterministicRecs } from "@/lib/insights";
import { buildPlanner } from "@/lib/planner";
import type { ConsolidatedPost } from "@/lib/schema";
import { Card, Eyebrow, Pill, SectionTitle } from "@/components/ui";

const PRIORITY_TONE = { High: "risk", Medium: "accent", Low: "default" } as const;

/* ---------------------- Strategic Recommendations ---------------------- */
export function AiStrategicRecommendations({ posts }: { posts: ConsolidatedPost[] }) {
  const { report, configured } = useAi();
  const ai = report?.strategicRecommendations ?? [];

  if (configured && ai.length) {
    return (
      <div className="space-y-3">
        {ai.map((r, i) => (
          <Card key={i} className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <Pill tone={PRIORITY_TONE[r.priority] ?? "default"}>{r.priority} priority</Pill>
              <AiTag />
            </div>
            <h3 className="display text-[17px] font-medium text-ink">{r.headline}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-graphite">{r.rationale}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-claret">{r.brandAlignment}</p>
          </Card>
        ))}
      </div>
    );
  }

  // Deterministic fallback.
  const recs = deterministicRecs(posts);
  return (
    <div className="space-y-3">
      {recs.map((r, i) => (
        <Card key={i} className="p-5">
          <div className="mb-2 flex items-center gap-2">
            <Pill tone={PRIORITY_TONE[r.priority] ?? "default"}>{r.priority} priority</Pill>
          </div>
          <h3 className="display text-[17px] font-medium text-ink">{r.headline}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-graphite">{r.rationale}</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-claret">{r.brandAlignment}</p>
          <p className="tabular mt-2 text-[11px] text-mist">{r.evidence}</p>
        </Card>
      ))}
    </div>
  );
}

/* ---------------------- Executive Summary (optional) ---------------------- */
export function AiExecutiveNarrative() {
  const { report, configured } = useAi();
  if (!configured || !report?.executiveSummary) return null;
  return (
    <Card className="mb-6 border-l-[3px] border-l-claret p-5">
      <div className="mb-2 flex items-center gap-2">
        <Eyebrow>AI Narrative</Eyebrow>
        <AiTag />
      </div>
      <p className="display text-[15px] leading-relaxed text-ink">{report.executiveSummary}</p>
    </Card>
  );
}

/* ---------------------- Content Strategy ---------------------- */
export function AiContentStrategy() {
  const { report, configured } = useAi();
  const blocks = report?.contentStrategy ?? [];
  if (!configured || !blocks.length) return null;
  return (
    <div className="mb-8">
      <SectionTitle eyebrow="AI · Content Strategy" title="Where to take the feed" />
      <div className="grid gap-4 sm:grid-cols-2">
        {blocks.map((b, i) => (
          <Card key={i} className="p-5">
            <h3 className="display text-[15px] font-medium text-ink">{b.theme}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-graphite">{b.direction}</p>
            <p className="mt-2 text-[12px] text-slate">
              <span className="text-mist">Reference · </span>
              {b.reference}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------------- What To Post Next ---------------------- */
export function AiWhatToPostNext() {
  const { report, configured } = useAi();
  const ideas = report?.whatToPostNext ?? [];
  if (!configured || !ideas.length) return null;
  return (
    <div className="mb-8">
      <SectionTitle eyebrow="AI · What to post next" title="The next few posts" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ideas.map((n, i) => (
          <Card key={i} className="p-5">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Pill tone="accent">{n.bucket}</Pill>
              <Pill>{n.format}</Pill>
            </div>
            <h3 className="display text-[15px] font-medium text-ink">{n.title}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-graphite">{n.why}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------------- Budget Allocation (AI overlay) ---------------------- */
export function AiBudgetAllocation() {
  const { report, configured } = useAi();
  const items = report?.budgetAllocation ?? [];
  if (!configured || !items.length) return null;
  const tone = (m: string) => (m === "Increase" ? "win" : m === "Decrease" ? "risk" : "default");
  return (
    <div className="mb-8">
      <SectionTitle eyebrow="AI · Budget guidance" title="Where the next rupee goes" hint="AI reading of the deterministic CPE and spend figures." />
      <div className="space-y-2.5">
        {items.map((b, i) => (
          <Card key={i} className="flex flex-wrap items-center gap-3 p-4">
            <Pill tone={tone(b.move) as "win" | "risk" | "default"}>{b.move}</Pill>
            <span className="text-[13px] font-medium text-ink">{b.target}</span>
            <span className="flex-1 text-[12px] leading-relaxed text-graphite">{b.rationale}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------------- Emerging Opportunities ---------------------- */
export function AiEmergingOpportunities() {
  const { report, configured } = useAi();
  const opps = report?.emergingOpportunities ?? [];
  if (!configured || !opps.length) return null;
  return (
    <div className="mb-8">
      <SectionTitle
        eyebrow="AI · Emerging opportunities"
        title="Live cultural signals"
        hint="Pulled from current India-relevant luxury, fashion-week and cultural moments via web grounding."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {opps.map((o, i) => (
          <Card key={i} className="p-5">
            <Eyebrow>{o.source}</Eyebrow>
            <h3 className="display mt-1.5 text-[15px] font-medium text-ink">{o.title}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-graphite">{o.angle}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------------- 30-Day Planner (AI or deterministic) ---------------------- */
export function AiPlanner({ posts }: { posts: ConsolidatedPost[] }) {
  const { report, configured } = useAi();
  const ai = report?.planner ?? [];

  if (configured && ai.length) {
    return (
      <div>
        <SectionTitle
          eyebrow="AI Content Planner · 30 Days"
          title="A month, composed"
          hint="Authored by AI from your performance and the TCL brief, grounded in live luxury trends. Business → topical → trend."
        />
        <div className="space-y-3">
          {ai.map((e, i) => (
            <Card key={i} className="p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-20 shrink-0">
                  <Eyebrow>Day {e.day}</Eyebrow>
                  <div className="tabular mt-1 text-[13px] text-ink">{e.postingDay}</div>
                </div>
                <div className="min-w-[240px] flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Pill tone="accent">{e.bucket}</Pill>
                    <Pill>{e.format}</Pill>
                    <AiTag className="ml-auto" />
                  </div>
                  <h3 className="display text-[16px] font-medium text-ink">{e.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-graphite">
                    <span className="text-mist">Hook · </span>
                    {e.hook}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-graphite">
                    <span className="text-mist">Caption · </span>
                    {e.captionDirection}
                  </p>
                  <div className="mt-2 grid gap-x-6 gap-y-1 text-[12px] text-slate sm:grid-cols-2">
                    <div><span className="text-mist">Reference · </span>{e.reference}</div>
                    <div><span className="text-mist">Objective · </span>{e.objective}</div>
                    <div><span className="text-mist">Expected KPI · </span>{e.expectedKpi}</div>
                  </div>
                  <p className="mt-2 text-[12px] italic leading-relaxed text-claret">{e.reason}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Deterministic fallback.
  const entries = buildPlanner(posts);
  return (
    <div>
      <SectionTitle
        eyebrow="Content Planner · 30 Days"
        title="A month, composed"
        hint="Built from your performance and the TCL content brief. Enable AI strategy for live-trend-grounded planning."
      />
      <div className="space-y-3">
        {entries.map((e) => (
          <Card key={e.day} className="p-5">
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-24 shrink-0">
                <Eyebrow>Day {e.day}</Eyebrow>
                <div className="tabular mt-1 text-[13px] text-ink">{e.postingDay}</div>
                <div className="tabular mt-0.5 text-[12px] text-slate">{e.bestTime}</div>
              </div>
              <div className="min-w-[240px] flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Pill tone="accent">{e.bucket}</Pill>
                  <Pill>{e.format}</Pill>
                  <span className="tabular ml-auto text-[12px] text-slate">Confidence {e.confidence}%</span>
                </div>
                <h3 className="display text-[16px] font-medium text-ink">{e.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-graphite">
                  <span className="text-mist">Hook · </span>
                  {e.hook}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-graphite">
                  <span className="text-mist">Caption · </span>
                  {e.captionDirection}
                </p>
                <div className="mt-2 grid gap-x-6 gap-y-1 text-[12px] text-slate sm:grid-cols-2">
                  <div><span className="text-mist">Reference · </span>{e.referenceStyle}</div>
                  <div><span className="text-mist">Objective · </span>{e.objective}</div>
                  <div><span className="text-mist">Expected KPI · </span>{e.expectedKpi}</div>
                </div>
                <p className="mt-2 text-[12px] italic leading-relaxed text-claret">{e.reason}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AiTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`eyebrow inline-flex items-center gap-1 rounded-full border border-claret/30 px-2 py-0.5 text-[9px] text-claret ${className}`}
    >
      AI
    </span>
  );
}
