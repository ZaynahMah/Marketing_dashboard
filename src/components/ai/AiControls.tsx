"use client";
import React from "react";
import { useAi } from "./AiProvider";
import { Eyebrow } from "@/components/ui";

/**
 * NO buttons. AI runs automatically (see AiProvider). These are passive UI:
 * a quiet inline status while analysing, and a token-usage footer shown as
 * informational metadata only.
 */

/** Small inline note shown at the top of a report while the analysis runs. */
export function AiAnalyzing() {
  const { configured, phase } = useAi();
  if (!configured) {
    return (
      <p className="text-[12px] leading-relaxed text-mist">
        AI analysis is off. Add a <code className="rounded bg-veil px-1 text-[11px] text-graphite">GEMINI_API_KEY</code> in
        Vercel to embed strategist insight into the sections below. All metrics, charts and downloads work without it.
      </p>
    );
  }
  if (phase === "loading")
    return (
      <div className="flex items-center gap-2 text-[12px] text-slate">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-claret" />
        Analysing this period — reading the numbers, causes and current trends…
      </div>
    );
  if (phase === "error")
    return <p className="text-[12px] text-mist">AI sections are showing the deterministic read (analysis unavailable this run).</p>;
  return null;
}

/** Token usage footer — informational metadata only. */
export function AiUsageSection() {
  const { report, configured } = useAi();
  if (!configured || !report) return null;
  const u = report.usage;
  const cost = u.estimatedCostUsd;

  const cells: [string, string][] = [
    ["Input Tokens", u.inputTokens.toLocaleString()],
    ["Output Tokens", u.outputTokens.toLocaleString()],
    ["Total Tokens", u.totalTokens.toLocaleString()],
    ["Model Used", u.model],
  ];

  return (
    <section className="mt-12 border-t border-hairline pt-5">
      <Eyebrow className="mb-3">Token Usage</Eyebrow>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
        {cells.map(([k, v]) => (
          <div key={k} className="bg-surface p-3.5">
            <Eyebrow>{k}</Eyebrow>
            <div className="tabular mt-1.5 text-[14px] text-ink">{v}</div>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-mist">
        Informational only. AI runs once per report and is cached — it authors the strategy narrative; every number,
        chart and download stays computed by the deterministic engine.
        {cost != null && ` · Est. cost ${cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(3)}`}`}
        {report.grounded && report.groundingSources.length > 0 && ` · ${report.groundingSources.length} live sources`}
      </p>
    </section>
  );
}
