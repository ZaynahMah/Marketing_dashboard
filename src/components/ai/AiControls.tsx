"use client";
import React from "react";
import { useAi } from "./AiProvider";
import { MODELS } from "@/lib/ai/pricing";
import type { AiModelId } from "@/lib/ai/types";
import { Card, Eyebrow, Pill } from "@/components/ui";

/**
 * Controls for the AI layer. Renders a Generate/Refresh button + model picker.
 * When no key is configured, shows a quiet note and the dashboard keeps using its
 * deterministic recommendations everywhere.
 */
export function AiControls() {
  const { configured, phase, report, model, setModel, reportType, generate, error } = useAi();

  const levelLabel = reportType === "weekly" ? "weekly intelligence" : reportType === "monthly" ? "monthly audit" : "AI strategy";

  if (!configured)
    return (
      <Card className="flex flex-wrap items-center gap-3 border-dashed p-4">
        <Pill>AI off</Pill>
        <p className="text-[12px] leading-relaxed text-slate">
          Strategy sections are showing the deterministic engine's output. Add a{" "}
          <code className="rounded bg-veil px-1 text-[11px] text-graphite">GEMINI_API_KEY</code> in your Vercel
          environment to enable AI-authored strategy grounded in live luxury trends.
        </p>
      </Card>
    );

  return (
    <Card className="flex flex-wrap items-center gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              phase === "ready" ? "bg-positive" : phase === "loading" ? "bg-claret" : "bg-mist"
            }`}
          />
        </span>
        <Eyebrow>AI Strategy</Eyebrow>
      </div>

      <select
        value={model}
        onChange={(e) => setModel(e.target.value as AiModelId)}
        disabled={phase === "loading"}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] text-ink focus:border-graphite disabled:opacity-50"
      >
        {Object.values(MODELS).map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
            {m.id === "gemini-2.5-flash" ? " · default" : ""}
          </option>
        ))}
      </select>

      <button
        onClick={() => generate(report != null)}
        disabled={phase === "loading"}
        className="rounded-full bg-ink px-4 py-1.5 text-[12px] font-medium text-paper hover:opacity-90 disabled:opacity-50"
      >
        {phase === "loading" ? "Generating…" : report ? `Refresh ${levelLabel}` : `Generate ${levelLabel}`}
      </button>

      {report && phase === "ready" && (
        <span className="tabular text-[11px] text-mist">
          {report.grounded ? "Grounded · " : ""}
          {new Date(report.generatedAt).toLocaleString()}
        </span>
      )}
      {phase === "error" && error && (
        <span className="text-[11px] text-negative">{error.slice(0, 120)}</span>
      )}
    </Card>
  );
}

export function AiUsageSection() {
  const { report, configured } = useAi();
  if (!configured || !report) return null;
  const u = report.usage;
  const cost = u.estimatedCostUsd;

  const cells: [string, string][] = [
    ["Model", u.model],
    ["Input tokens", u.inputTokens.toLocaleString()],
    ["Output tokens", u.outputTokens.toLocaleString()],
    ["Total tokens", u.totalTokens.toLocaleString()],
    ["Grounding queries", String(u.groundingQueries)],
    ["Est. cost", cost === null ? "—" : cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(3)}`],
  ];

  return (
    <section className="mt-12">
      <Eyebrow className="mb-3">AI Usage</Eyebrow>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {cells.map(([k, v]) => (
          <div key={k} className="bg-surface p-3.5">
            <Eyebrow>{k}</Eyebrow>
            <div className="tabular mt-1.5 text-[14px] text-ink">{v}</div>
          </div>
        ))}
      </div>
      {u.thoughtsTokens ? (
        <p className="tabular mt-2 text-[11px] text-mist">
          Includes {u.thoughtsTokens.toLocaleString()} thinking tokens (billed as output).
        </p>
      ) : null}
      {report.groundingSources.length > 0 && (
        <div className="mt-3">
          <Eyebrow className="mb-1.5">Live sources referenced</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {report.groundingSources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="max-w-[220px] truncate rounded-full border border-line px-3 py-1 text-[11px] text-slate hover:border-graphite hover:text-claret"
              >
                {s.title || s.url}
              </a>
            ))}
          </div>
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-mist">
        Cost is estimated from published Gemini rates (input/output tokens + Search grounding) and may differ from
        your actual bill. All KPIs, charts, rankings and Excel remain computed by the deterministic engine — AI
        authors strategy narrative only.
      </p>
    </section>
  );
}
