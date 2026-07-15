"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildAiSummary } from "@/lib/ai/summary";
import { fetchAiReport, fetchAiStatus } from "@/lib/ai/client";
import { DEFAULT_MODEL } from "@/lib/ai/pricing";
import type { AiModelId, AiReport, AiReportType } from "@/lib/ai/types";
import type { ConsolidatedPost } from "@/lib/schema";

type Phase = "idle" | "loading" | "ready" | "error";

interface AiState {
  configured: boolean;
  phase: Phase;
  report: AiReport | null; // report for the active reportType
  error: string | null;
  model: AiModelId;
  setModel: (m: AiModelId) => void;
  reportType: AiReportType;
  setReportType: (t: AiReportType) => void;
  generate: (force?: boolean) => void;
}

const Ctx = createContext<AiState | null>(null);

export function useAi(): AiState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAi must be used within <AiProvider>");
  return ctx;
}

/**
 * Scopes AI state to one snapshot. Reports are cached per snapshot+reportType+model
 * in memory, so switching dashboard tabs or report levels never re-calls Gemini —
 * only an explicit generate/refresh does.
 */
export function AiProvider({
  snapshotId,
  posts,
  prev,
  reportType,
  setReportType,
  children,
}: {
  snapshotId: string;
  posts: ConsolidatedPost[];
  prev?: ConsolidatedPost[];
  reportType: AiReportType;
  setReportType: (t: AiReportType) => void;
  children: React.ReactNode;
}) {
  const [configured, setConfigured] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<AiReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<AiModelId>(DEFAULT_MODEL);

  const cache = useRef<Map<string, AiReport>>(new Map());
  const keyOf = (t: AiReportType) => `${snapshotId}:${t}:${model}`;

  useEffect(() => {
    let live = true;
    fetchAiStatus().then((s) => {
      if (live) setConfigured(s.enabled);
    });
    return () => {
      live = false;
    };
  }, []);

  // Reflect cache when snapshot / reportType / model changes.
  useEffect(() => {
    const cached = cache.current.get(keyOf(reportType));
    if (cached) {
      setReport(cached);
      setPhase("ready");
      setError(null);
    } else {
      setReport(null);
      setPhase("idle");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotId, reportType, model]);

  const generate = useCallback(
    async (force = false) => {
      const cacheKey = keyOf(reportType);
      if (!force && cache.current.has(cacheKey)) {
        setReport(cache.current.get(cacheKey)!);
        setPhase("ready");
        return;
      }
      setPhase("loading");
      setError(null);
      try {
        const summary = buildAiSummary(posts, prev);
        const res = await fetchAiReport(summary, model, reportType);
        if (!res.enabled) {
          setConfigured(false);
          setError(res.reason);
          setPhase("error");
          return;
        }
        cache.current.set(cacheKey, res.report);
        setReport(res.report);
        setPhase("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed.");
        setPhase("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshotId, model, reportType, posts, prev]
  );

  const value = useMemo<AiState>(
    () => ({ configured, phase, report, error, model, setModel, reportType, setReportType, generate }),
    [configured, phase, report, error, model, reportType, setReportType, generate]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
