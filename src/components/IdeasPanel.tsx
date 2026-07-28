"use client";
import React, { useEffect, useState } from "react";
import { Card, Empty, Eyebrow, Pill, SectionTitle } from "@/components/ui";
import type { AiIdeasResponse } from "@/lib/ai/types";

function useIdeas() {
  const [state, setState] = useState<{ status: "idle" | "loading" | "ready" | "error" | "disabled"; data?: AiIdeasResponse; error?: string }>({ status: "idle" });
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    fetch("/api/ideas")
      .then((r) => r.json())
      .then((data: AiIdeasResponse) => {
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
};

export function IdeasPanel() {
  const { status, data, error } = useIdeas();

  return (
    <div>
      <SectionTitle
        eyebrow={data?.generatedFor ? `Refreshed for ${data.generatedFor}${data.fromCache ? " · cached" : ""}` : "Daily creative brief"}
        title="15 High-Impact Content Ideas"
        hint="Authored by a Senior Creative Director + Luxury Social Strategist agent. Refreshed once every calendar day. Every idea is grounded in a live, named trend and uses only brands on the TCL catalog."
      />

      {status === "loading" && (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-[13px] text-slate">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-claret" />
            Composing today's ideas — scanning fashion weeks, Vogue, BoF, Google Trends, celebrity news…
          </div>
        </Card>
      )}

      {status === "disabled" && (
        <Empty
          title="AI Ideas are off"
          body={`Add a GEMINI_API_KEY in Vercel to enable the daily creative brief. ${error ? `(${error})` : ""}`}
        />
      )}

      {status === "error" && (
        <Empty title="Ideas unavailable this cycle" body={error ?? "Please retry."} />
      )}

      {status === "ready" && data?.ideas && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.ideas.map((idea, i) => (
              <Card key={i} className="flex flex-col p-5">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="tabular text-[11px] text-mist">#{String(i + 1).padStart(2, "0")}</span>
                  <Pill tone={FMT_TONE[idea.format] ?? "default"}>{idea.format}</Pill>
                  <Pill>{idea.category}</Pill>
                  {idea.autoDm && <Pill tone="accent">Auto-DM</Pill>}
                </div>
                <h3 className="display text-[15px] font-medium leading-snug text-ink">{idea.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-graphite">
                  <span className="text-mist">Hook · </span>
                  {idea.hook}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-graphite">{idea.description}</p>

                {idea.brands.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {idea.brands.map((b, j) => (
                      <span key={j} className="tabular rounded-full border border-line px-2 py-0.5 text-[11px] text-slate">{b}</span>
                    ))}
                  </div>
                )}

                <div className="mt-3 space-y-1.5 border-t border-hairline pt-3 text-[12px] leading-relaxed">
                  <div className="text-graphite">
                    <span className="text-mist">Direction · </span>
                    {idea.creativeDirection}
                  </div>
                  <div className="text-claret">
                    <span className="text-mist">Why now · </span>
                    {idea.whyTrendMatters}
                  </div>
                  <div className="text-graphite">
                    <span className="text-mist">Why TCL · </span>
                    {idea.whyTCLShouldPost}
                  </div>
                  <div className="text-graphite">
                    <span className="text-mist">CTA · </span>
                    {idea.cta}
                  </div>
                  {idea.liveReference && (
                    <div className="text-slate">
                      <span className="text-mist">Reference · </span>
                      {idea.liveReference}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {data.usage && (
            <div className="mt-8 border-t border-hairline pt-5">
              <Eyebrow className="mb-2">Ideas Usage</Eyebrow>
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
