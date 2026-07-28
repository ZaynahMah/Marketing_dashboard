"use client";
import React, { useEffect, useState } from "react";
import { Card, Empty, Eyebrow, Pill, SectionTitle } from "@/components/ui";
import type { AiRecommendationsResponse } from "@/lib/ai/types";

function useRecommendations() {
  const [state, setState] = useState<{ status: "idle" | "loading" | "ready" | "error" | "disabled"; data?: AiRecommendationsResponse; error?: string }>({ status: "idle" });
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((data: AiRecommendationsResponse) => {
        if (!alive) return;
        if (!data.enabled) return setState({ status: "disabled", data, error: data.reason });
        setState({ status: "ready", data });
      })
      .catch((e) => alive && setState({ status: "error", error: e instanceof Error ? e.message : "Failed" }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

const FMT_TONE: Record<string, "accent" | "win" | "risk" | "default"> = {
  Reel: "accent",
  Carousel: "win",
  Static: "default",
  Story: "risk",
  "Instagram Live": "accent",
  "Brand Film": "win",
};

const PERF_TONE: Record<string, "win" | "accent" | "default"> = {
  Breakout: "win",
  Strong: "accent",
  Reliable: "default",
};

export function RecommendationsPanel() {
  const { status, data, error } = useRecommendations();

  return (
    <div>
      <SectionTitle
        eyebrow={data?.generatedFor ? `Refreshed for ${data.generatedFor}${data.fromCache ? " · cached" : ""}` : "Daily creative brief"}
        title="20 Brand-Level Content Recommendations"
        hint="Seven flagship recurring formats plus thirteen trend-anchored one-offs. Every recommendation names brands from the TCL catalog and ties to a live cultural signal. Refreshed once per calendar day."
      />

      {status === "loading" && (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-[13px] text-slate">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-claret" />
            Composing 20 recommendations — scanning Vogue, BoF, WWD, Google Trends, celebrity news, festivals…
          </div>
        </Card>
      )}

      {status === "disabled" && (
        <Empty title="AI Recommendations are off" body={`Add a GEMINI_API_KEY in Vercel to enable. ${error ? `(${error})` : ""}`} />
      )}
      {status === "error" && <Empty title="Recommendations unavailable" body={error ?? "Please retry."} />}

      {status === "ready" && data?.recommendations && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.recommendations.map((r, i) => (
              <Card key={i} className={`flex flex-col p-5 ${r.isFlagshipRecurring ? "border-l-[3px] border-l-claret" : ""}`}>
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="tabular text-[11px] text-mist">#{String(i + 1).padStart(2, "0")}</span>
                  <Pill tone={FMT_TONE[r.format] ?? "default"}>{r.format}</Pill>
                  {r.isFlagshipRecurring && <Pill tone="accent">Flagship recurring</Pill>}
                  <Pill tone={PERF_TONE[r.predictedPerformance] ?? "default"}>{r.predictedPerformance}</Pill>
                  <Pill>{r.difficulty}</Pill>
                </div>
                <h3 className="display text-[15px] font-medium leading-snug text-ink">{r.title}</h3>
                {r.flagshipStructure && (
                  <p className="mt-1 text-[11px] italic text-claret">{r.flagshipStructure}</p>
                )}
                <p className="mt-2 text-[13px] leading-relaxed text-graphite">
                  <span className="text-mist">Hook · </span>{r.hook}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-graphite">{r.concept}</p>

                {r.brands.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {r.brands.map((b, j) => (
                      <span key={j} className="tabular rounded-full border border-line px-2 py-0.5 text-[11px] text-slate">{b}</span>
                    ))}
                  </div>
                )}

                <div className="mt-3 space-y-1.5 border-t border-hairline pt-3 text-[12px] leading-relaxed">
                  <div className="text-graphite"><span className="text-mist">Why it works · </span>{r.whyItWillWork}</div>
                  <div className="text-positive"><span className="text-mist">Expected KPI · </span>{r.expectedKpiImpact}</div>
                  <div className="text-graphite"><span className="text-mist">Audience intent · </span>{r.audienceIntent}</div>
                  <div className="text-claret"><span className="text-mist">Trend · </span>{r.trendConnection}</div>
                  <div className="text-graphite"><span className="text-mist">Execution · </span>{r.executionNotes}</div>
                </div>
              </Card>
            ))}
          </div>

          {data.usage && (
            <div className="mt-8 border-t border-hairline pt-5">
              <Eyebrow className="mb-2">Recommendations Usage</Eyebrow>
              <p className="tabular text-[11px] leading-relaxed text-mist">
                {data.model} · Input {data.usage.inputTokens.toLocaleString()} · Output {data.usage.outputTokens.toLocaleString()} · Total {data.usage.totalTokens.toLocaleString()}
                {data.usage.estimatedCostUsd != null && ` · Est. cost $${data.usage.estimatedCostUsd.toFixed(4)}`}
                {data.groundingSources && data.groundingSources.length > 0 && ` · ${data.groundingSources.length} live sources`}
                {data.fromCache && ` · served from daily cache`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
