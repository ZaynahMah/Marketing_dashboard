"use client";
import React from "react";
import { useAi } from "./AiProvider";
import { buildPlanner } from "@/lib/planner";
import type { ConsolidatedPost } from "@/lib/schema";
import type { AiFinding } from "@/lib/ai/types";
import { Card, Eyebrow, Empty, Pill, SectionTitle } from "@/components/ui";

const P_TONE = { P1: "risk", P2: "accent", P3: "default" } as const;

function useStrategist() {
  const { report } = useAi();
  return report?.strategist;
}

/* ------------ Executive Summary (narrative) ------------ */
export function AiExecutiveNarrative() {
  const s = useStrategist();
  if (!s?.executiveSummary) return null;
  return (
    <Card className="mb-6 border-l-[3px] border-l-claret p-5">
      <Eyebrow className="mb-2">Executive Summary</Eyebrow>
      <p className="display text-[15px] leading-relaxed text-ink">{s.executiveSummary}</p>
    </Card>
  );
}

/* ------------ Generic finding renderers ------------ */
function FindingCards({ items, mode }: { items?: AiFinding[]; mode: "why" | "action" }) {
  if (!items?.length) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((f, i) => (
        <Card key={i} className="p-5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h3 className="display text-[15px] font-medium text-ink">{f.title}</h3>
            <Pill tone={P_TONE[f.priority] ?? "default"}>{f.priority}</Pill>
          </div>
          <p className="text-[13px] leading-relaxed text-graphite">{f.whatHappened}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-claret">
            <span className="text-mist">Why · </span>
            {f.whyItHappened}
          </p>
          {mode === "action" ? (
            <div className="mt-2 border-t border-hairline pt-2 text-[12px] leading-relaxed text-graphite">
              <span className="text-mist">Do · </span>
              {f.recommendedAction}
              <div className="mt-0.5 text-slate">
                <span className="text-mist">Expected · </span>
                {f.expectedOutcome}
              </div>
            </div>
          ) : (
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate">
              <span className="text-mist">Impact · </span>
              {f.businessImpact}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}

function FindingList({ items, tone }: { items?: AiFinding[]; tone: "win" | "risk" | "accent" }) {
  if (!items?.length) return null;
  const dot = tone === "win" ? "text-positive" : tone === "risk" ? "text-negative" : "text-claret";
  return (
    <div className="space-y-2.5">
      {items.map((f, i) => (
        <Card key={i} className="flex gap-3 p-4">
          <span className={`mt-0.5 text-[13px] ${dot}`}>{f.priority}</span>
          <div>
            <div className="text-[13px] font-medium text-ink">{f.title}</div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-graphite">{f.recommendedAction || f.whatHappened}</p>
            {f.expectedOutcome && <p className="mt-0.5 text-[12px] text-slate"><span className="text-mist">Expected · </span>{f.expectedOutcome}</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ------------ Named sections (only render if AI produced them) ------------ */
export function AiWhatWorked() {
  const s = useStrategist();
  if (!s?.whatWorked?.length) return null;
  return <Block title="What Worked — and Why"><FindingCards items={s.whatWorked} mode="why" /></Block>;
}
export function AiWhatDidntWork() {
  const s = useStrategist();
  if (!s?.whatDidntWork?.length) return null;
  return <Block title="What Didn't Work — and Why"><FindingCards items={s.whatDidntWork} mode="why" /></Block>;
}
export function AiWhereToActNext() {
  const s = useStrategist();
  if (!s?.whereToActNext?.length) return null;
  return <Block title="Where to Act Next"><FindingCards items={s.whereToActNext} mode="action" /></Block>;
}
export function AiImprovements() {
  const s = useStrategist();
  const items = s?.whatDidntWork?.filter((f) => f.recommendedAction);
  if (!items?.length) return null;
  return (
    <Block title="Recommendations for Improvement">
      <div className="space-y-1.5">
        {items.map((f, i) => (
          <div key={i} className="flex gap-2 text-[13px] leading-relaxed text-graphite">
            <span className="text-claret">·</span>
            <span><span className="text-ink">{f.recommendedAction}</span> <span className="text-mist">— {f.expectedOutcome}</span></span>
          </div>
        ))}
      </div>
    </Block>
  );
}
export function AiStrategicPriorities() {
  const s = useStrategist();
  if (!s?.strategicPriorities?.length) return null;
  return <Block title="Strategic Priorities"><FindingList items={s.strategicPriorities} tone="accent" /></Block>;
}
export function AiRisks() {
  const s = useStrategist();
  if (!s?.risks?.length) return null;
  return <Block title="Risks & Watchouts"><FindingList items={s.risks} tone="risk" /></Block>;
}
export function AiGrowthLevers() {
  const s = useStrategist();
  if (!s?.growthLevers?.length) return null;
  return <Block title="Growth Levers"><FindingList items={s.growthLevers} tone="win" /></Block>;
}
export function AiOpportunities() {
  const s = useStrategist();
  if (!s?.opportunities?.length) return null;
  return (
    <Block title="Opportunities">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {s.opportunities.map((f, i) => (
          <Card key={i} className="p-5">
            <div className="mb-1.5 flex items-center justify-between"><Eyebrow>{f.priority}</Eyebrow></div>
            <h3 className="display text-[15px] font-medium text-ink">{f.title}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-graphite">{f.whyItHappened}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-claret"><span className="text-mist">Play · </span>{f.recommendedAction}</p>
          </Card>
        ))}
      </div>
    </Block>
  );
}

/* ------------ CONSULTING-STYLE EXECUTIVE SUMMARY (McKinsey voice) ------------ */

function EvidenceList({ items, tone }: { items: { point: string; metric: string }[]; tone: "win" | "risk" | "accent" | "default" }) {
  const border: Record<string, string> = {
    win: "border-l-positive",
    risk: "border-l-negative",
    accent: "border-l-claret",
    default: "border-l-line",
  };
  return (
    <ul className="space-y-2.5">
      {items.map((b, i) => (
        <li key={i} className={`border-l-[3px] ${border[tone]} pl-3`}>
          <p className="text-[13px] leading-relaxed text-ink">{b.point}</p>
          <p className="tabular mt-0.5 text-[11px] text-slate">{b.metric}</p>
        </li>
      ))}
    </ul>
  );
}

export function AiConsultingKeyWins() {
  const s = useStrategist();
  const c = s?.consulting;
  if (!c?.keyWins?.length) return null;
  return (
    <Block title="Key Wins ↑">
      <Card className="p-5"><EvidenceList items={c.keyWins} tone="win" /></Card>
    </Block>
  );
}

export function AiConsultingRedFlags() {
  const s = useStrategist();
  const c = s?.consulting;
  if (!c?.redFlags?.length) return null;
  return (
    <Block title="Red Flags ↓">
      <Card className="p-5"><EvidenceList items={c.redFlags} tone="risk" /></Card>
    </Block>
  );
}

export function AiConsultingContentGaps() {
  const s = useStrategist();
  const c = s?.consulting?.contentGaps;
  if (!c) return null;
  const any = (c.trendsNotLeveraged?.length ?? 0) + (c.formatsNotExplored?.length ?? 0) + (c.audienceSignalsIgnored?.length ?? 0);
  if (!any) return null;
  return (
    <Block title="Content Gaps & Missed Opportunities">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <Eyebrow className="mb-3">Trends Not Leveraged</Eyebrow>
          <EvidenceList items={c.trendsNotLeveraged ?? []} tone="accent" />
        </Card>
        <Card className="p-5">
          <Eyebrow className="mb-3">Formats Not Explored</Eyebrow>
          <EvidenceList items={c.formatsNotExplored ?? []} tone="accent" />
        </Card>
        <Card className="p-5">
          <Eyebrow className="mb-3">Audience Signals Ignored</Eyebrow>
          <EvidenceList items={c.audienceSignalsIgnored ?? []} tone="accent" />
        </Card>
      </div>
    </Block>
  );
}

export function AiConsultingAudience() {
  const s = useStrategist();
  const a = s?.consulting?.audienceInsights;
  if (!a) return null;
  const rows: [string, string | undefined][] = [
    ["Save & Share Behaviour", a.saveShareBehaviour],
    ["Content Preference Signals", a.contentPreferenceSignals],
    ["Audience Intent", a.audienceIntent],
    ["Timing Insights", a.timingInsights],
    ["Posting Frequency Insights", a.postingFrequencyInsights],
    ["Optimal Posting Cadence", a.optimalPostingCadence],
  ].filter(([, v]) => v && String(v).trim().length > 0) as [string, string][];
  if (!rows.length) return null;
  return (
    <Block title="Audience Insights">
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(([k, v]) => (
          <Card key={k} className="p-5">
            <Eyebrow className="mb-2">{k}</Eyebrow>
            <p className="text-[13px] leading-relaxed text-ink">{v}</p>
          </Card>
        ))}
      </div>
    </Block>
  );
}

export function AiConsultingBrutalTruth() {
  const s = useStrategist();
  const t = s?.consulting?.brutalTruth;
  if (!t) return null;
  return (
    <Block title="Brutal Truth">
      <Card className="border-l-[3px] border-l-ink p-6">
        <p className="display text-[15px] leading-relaxed text-ink">{t}</p>
      </Card>
    </Block>
  );
}

/* ------------ 30-day planner (AI, deterministic fallback) ------------ */
export function AiPlanner({ posts }: { posts: ConsolidatedPost[] }) {
  const { report, configured, phase } = useAi();
  const ai = report?.planner ?? [];

  if (configured && ai.length) {
    return (
      <div>
        <SectionTitle eyebrow="Content Planner · 30 Days" title="A month, composed" hint="Authored from your performance and the TCL brief, grounded in live trends. Business → topical → trend." />
        <div className="space-y-3">
          {ai.map((e, i) => (
            <Card key={i} className="p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-20 shrink-0"><Eyebrow>Day {e.day}</Eyebrow><div className="tabular mt-1 text-[13px] text-ink">{e.postingDay}</div></div>
                <div className="min-w-[240px] flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2"><Pill tone="accent">{e.bucket}</Pill><Pill>{e.format}</Pill></div>
                  <h3 className="display text-[16px] font-medium text-ink">{e.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-graphite"><span className="text-mist">Hook · </span>{e.hook}</p>
                  <div className="mt-2 grid gap-x-6 gap-y-1 text-[12px] text-slate sm:grid-cols-2">
                    <div><span className="text-mist">Reference · </span>{e.reference}</div>
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

  if (configured && phase === "loading") return <Empty title="Composing the 30-day plan…" body="The planner is being written from your performance and current trends." />;

  const entries = buildPlanner(posts);
  return (
    <div>
      <SectionTitle eyebrow="Content Planner · 30 Days" title="A month, composed" hint="Built from your performance and the TCL brief." />
      <div className="space-y-3">
        {entries.map((e) => (
          <Card key={e.day} className="p-5">
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-24 shrink-0"><Eyebrow>Day {e.day}</Eyebrow><div className="tabular mt-1 text-[13px] text-ink">{e.postingDay}</div><div className="tabular mt-0.5 text-[12px] text-slate">{e.bestTime}</div></div>
              <div className="min-w-[240px] flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2"><Pill tone="accent">{e.bucket}</Pill><Pill>{e.format}</Pill><span className="tabular ml-auto text-[12px] text-slate">Confidence {e.confidence}%</span></div>
                <h3 className="display text-[16px] font-medium text-ink">{e.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-graphite"><span className="text-mist">Hook · </span>{e.hook}</p>
                <div className="mt-2 grid gap-x-6 gap-y-1 text-[12px] text-slate sm:grid-cols-2">
                  <div><span className="text-mist">Reference · </span>{e.referenceStyle}</div>
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

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="display mb-3 text-[19px] font-medium text-ink">{title}</h2>
      {children}
    </section>
  );
}
