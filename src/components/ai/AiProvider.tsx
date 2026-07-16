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
  report: AiReport | null;
  error: string | null;
  reportType: AiReportType;
}

const Ctx = createContext<AiState | null>(null);

export function useAi(): AiState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAi must be used within <AiProvider>");
  return ctx;
}

/**
 * Runs the AI analysis AUTOMATICALLY — no buttons. When a snapshot / report level
 * becomes active and a key is configured, it generates once and caches the result
 * per snapshot+reportType, so switching tabs or levels never re-calls the API.
 * With no key, phase stays idle and sections fall back to deterministic output.
 */
export function AiProvider({
  snapshotId,
  posts,
  prev,
  reportType,
  children,
}: {
  snapshotId: string;
  posts: ConsolidatedPost[];
  prev?: ConsolidatedPost[];
  reportType: AiReportType;
  children: React.ReactNode;
}) {
  const [configured, setConfigured] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<AiReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<AiModelId>(DEFAULT_MODEL);

  const cache = useRef<Map<string, AiReport>>(new Map());
  const attempted = useRef<Set<string>>(new Set());
  const keyOf = (t: AiReportType) => `${snapshotId}:${t}:${model}`;

  useEffect(() => {
    let live = true;
    fetchAiStatus().then((s) => {
      if (!live) return;
      setConfigured(s.enabled);
      setModel(s.defaultModel);
      setStatusLoaded(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const runGenerate = useCallback(async () => {
    const cacheKey = keyOf(reportType);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotId, reportType, model, posts, prev]);

  // Reflect cache and AUTO-GENERATE when the active snapshot / report level changes.
  useEffect(() => {
    if (!statusLoaded) return;
    const key = keyOf(reportType);
    const cached = cache.current.get(key);
    if (cached) {
      setReport(cached);
      setPhase("ready");
      setError(null);
      return;
    }
    setReport(null);
    setError(null);
    if (!configured || !posts.length) {
      setPhase("idle");
      return;
    }
    if (attempted.current.has(key)) {
      // Already tried and it errored — don't loop; leave in error/idle.
      return;
    }
    attempted.current.add(key);
    runGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusLoaded, configured, snapshotId, reportType, model]);

  const value = useMemo<AiState>(
    () => ({ configured, phase, report, error, reportType }),
    [configured, phase, report, error, reportType]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
