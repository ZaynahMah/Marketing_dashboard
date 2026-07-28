"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Card, Empty, Eyebrow, Pill, SectionTitle } from "@/components/ui";
import type { AiAnalysisResponse, AiPostAnalysis } from "@/lib/ai/types";
import { toViewPosts } from "@/lib/view-mode";
import type { ViewMode } from "@/lib/view-mode";
import type { ConsolidatedPost } from "@/lib/schema";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/normalize";
import { computeMedians, deterministicPostReport } from "@/lib/verdict";

const VERDICT_TONE: Record<string, "win" | "risk" | "accent" | "default"> = {
  "Scale Immediately": "win",
  "Repeat": "win",
  "High Saves": "win",
  "Evergreen": "accent",
  "Improve Hook": "accent",
  "Needs Better CTA": "accent",
  "High Reach Low Engagement": "risk",
  "Reduce Frequency": "risk",
  "Weak Performer": "risk",
};

interface Props {
  snapshotId: string;
  posts: ConsolidatedPost[];
  mode: ViewMode;
}

export function AnalysisPanel({ snapshotId, posts, mode }: Props) {
  const view = useMemo(() => toViewPosts(posts, mode), [posts, mode]);
  const [state, setState] = useState<{ status: "idle" | "loading" | "ready" | "disabled" | "error"; data?: AiAnalysisResponse; error?: string }>({ status: "idle" });
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshotId: `${snapshotId}-${mode}`, posts: view }),
    })
      .then((r) => r.json())
      .then((data: AiAnalysisResponse) => {
        if (!alive) return;
        if (!data.enabled) return setState({ status: "disabled", data, error: data.reason });
        setState({ status: "ready", data });
      })
      .catch((e) => alive && setState({ status: "error", error: e instanceof Error ? e.message : "Failed" }));
    return () => {
      alive = false;
    };
  }, [snapshotId, view, mode]);

  const medians = useMemo(() => computeMedians(view), [view]);

  const byShortcode = useMemo(() => {
    const map = new Map<string, { a: AiPostAnalysis; source: "ai" | "fallback" }>();
    const aiSet = new Set<string>();
    (state.data?.postAnalyses ?? []).forEach((a) => {
      if (a.shortcode) {
        map.set(a.shortcode, { a, source: "ai" });
        aiSet.add(a.shortcode);
      }
    });
    // Backfill any post the AI omitted with a deterministic read so nothing is blank.
    for (const p of view) {
      if (!aiSet.has(p.shortcode)) {
        map.set(p.shortcode, { a: deterministicPostReport(p, medians), source: "fallback" });
      }
    }
    return map;
  }, [state.data, view, medians]);

  const aiCount = state.data?.postAnalyses?.length ?? 0;
  const fallbackCount = view.length - aiCount;

  return (
    <div className="fade-in">
      <SectionTitle
        eyebrow="Deep AI Analysis"
        title="Every post, read in full"
        hint="For each post: why it worked or failed, what audience behaviour it triggered, the metrics that support the read, and the recommended next iteration. Grounded in current signals via live search."
      />

      {state.status === "loading" && (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-[13px] text-slate">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-claret" />
            Reading {view.length} post{view.length === 1 ? "" : "s"} — this is the heaviest AI pass and can take 30-60 seconds.
          </div>
        </Card>
      )}

      {state.status === "disabled" && <Empty title="AI Analysis is off" body={state.error ?? "Add GEMINI_API_KEY in Vercel to enable."} />}
      {state.status === "error" && <Empty title="Analysis unavailable" body={state.error ?? "Please retry."} />}

      {state.status === "ready" && state.data?.continueStopStart && (
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card className="border-l-[3px] border-l-positive p-5">
            <Eyebrow className="mb-3">Continue Doing</Eyebrow>
            <ul className="space-y-2.5">
              {state.data.continueStopStart.continueDoing.map((b, i) => (
                <li key={i}>
                  <p className="text-[13px] leading-relaxed text-ink">{b.point}</p>
                  <p className="tabular mt-0.5 text-[11px] text-slate">{b.metric}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="border-l-[3px] border-l-negative p-5">
            <Eyebrow className="mb-3">Stop Doing</Eyebrow>
            <ul className="space-y-2.5">
              {state.data.continueStopStart.stopDoing.map((b, i) => (
                <li key={i}>
                  <p className="text-[13px] leading-relaxed text-ink">{b.point}</p>
                  <p className="tabular mt-0.5 text-[11px] text-slate">{b.metric}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="border-l-[3px] border-l-claret p-5">
            <Eyebrow className="mb-3">Start Doing</Eyebrow>
            <ul className="space-y-2.5">
              {state.data.continueStopStart.startDoing.map((b, i) => (
                <li key={i}>
                  <p className="text-[13px] leading-relaxed text-ink">{b.point}</p>
                  <p className="tabular mt-0.5 text-[11px] text-slate">{b.metric}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <p className="mb-4 text-[11px] text-mist">
            AI-authored reads for {aiCount} of {view.length} posts.
            {fallbackCount > 0 && ` Remaining ${fallbackCount} carry a deterministic read derived from the post's own numbers vs the dataset median.`}
          </p>
          <div className="space-y-3">
          {view.map((p) => {
            const entry = byShortcode.get(p.shortcode);
            const a = entry?.a;
            const source = entry?.source;
            const open = expanded === p.shortcode;
            return (
              <Card key={p.shortcode} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <Pill>{p.format}</Pill>
                      <Pill tone="accent">{p.contentBucket}</Pill>
                      {a && <Pill tone={VERDICT_TONE[a.verdict] ?? "default"}>{a.verdict}</Pill>}
                      {a && <span className="tabular text-[11px] text-mist">Confidence {a.confidenceScore}%</span>}
                      {source === "fallback" && <span className="eyebrow text-mist">Deterministic read</span>}
                    </div>
                    <a href={p.postLink} target="_blank" rel="noreferrer" className="display line-clamp-2 text-[14px] leading-snug text-ink hover:text-claret hover:underline">
                      {p.description || p.shortcode}
                    </a>
                    <div className="tabular mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate">
                      <span>Reach {fmtCompact(p.reach ?? 0)}</span>
                      <span>Views {fmtCompact(p.views ?? 0)}</span>
                      <span>Saves {fmtInt(p.saves ?? 0)}</span>
                      <span>Shares {fmtInt(p.shares ?? 0)}</span>
                      <span>ER {fmtPct(p.er, 2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(open ? null : p.shortcode)}
                    className="eyebrow shrink-0 rounded-full border border-line px-3 py-1 text-slate hover:border-graphite hover:text-ink"
                  >
                    {open ? "Collapse" : "Read analysis"}
                  </button>
                </div>
                {open && a && (
                  <div className="mt-4 grid gap-3 border-t border-hairline pt-4 md:grid-cols-2">
                    {a.whyItWorked && <ReadRow label="Why it worked" body={a.whyItWorked} tone="win" />}
                    {a.whyItFailed && <ReadRow label="Why it failed" body={a.whyItFailed} tone="risk" />}
                    <ReadRow label="Audience behaviour triggered" body={a.audienceBehaviourTriggered} />
                    <ReadRow label="Supporting metrics" body={a.supportingMetrics} tone="mono" />
                    <ReadRow label="Key learning" body={a.keyLearning} />
                    <ReadRow label="Predictable future opportunity" body={a.predictableFutureOpportunity} tone="accent" />
                    <ReadRow label="Recommended next iteration" body={a.recommendedNextIteration} tone="accent" />
                  </div>
                )}
              </Card>
            );
          })}
          </div>
        </>
      )}

      {state.data?.usage && (
        <div className="mt-8 border-t border-hairline pt-5">
          <Eyebrow className="mb-2">Analysis Usage</Eyebrow>
          <p className="tabular text-[11px] leading-relaxed text-mist">
            {state.data.model} · Input {state.data.usage.inputTokens.toLocaleString()} · Output {state.data.usage.outputTokens.toLocaleString()} · Total {state.data.usage.totalTokens.toLocaleString()}
            {state.data.usage.estimatedCostUsd != null && ` · Est. cost $${state.data.usage.estimatedCostUsd.toFixed(4)}`}
            {state.data.groundingSources && state.data.groundingSources.length > 0 && ` · ${state.data.groundingSources.length} live sources`}
          </p>
        </div>
      )}
    </div>
  );
}

function ReadRow({ label, body, tone = "default" }: { label: string; body: string; tone?: "default" | "win" | "risk" | "accent" | "mono" }) {
  const cls: Record<string, string> = {
    default: "text-graphite",
    win: "text-positive",
    risk: "text-negative",
    accent: "text-claret",
    mono: "tabular text-graphite",
  };
  return (
    <div>
      <Eyebrow className="mb-1">{label}</Eyebrow>
      <p className={`text-[12px] leading-relaxed ${cls[tone]}`}>{body}</p>
    </div>
  );
}
