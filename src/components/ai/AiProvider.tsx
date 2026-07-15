"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildAiSummary } from "@/lib/ai/summary";
import { fetchAiReport, fetchAiStatus } from "@/lib/ai/client";
import { DEFAULT_MODEL } from "@/lib/ai/pricing";
import type { AiModelId, AiReport } from "@/lib/ai/types";
import type { ConsolidatedPost } from "@/lib/schema";

type Phase = "idle" | "loading" | "ready" | "error";

interface AiState {
  configured: boolean; // is a server key present
  phase: Phase;
  report: AiReport | null;
  error: string | null;
  model: AiModelId;
  setModel: (m: AiModelId) => void;
  generate: (force?: boolean) => void;
}

const Ctx = createContext<AiState | null>(null);

export function useAi(): AiState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAi must be used within <AiProvider>");
  return ctx;
}

/**
 * Scopes AI state to a single snapshot (keyed by snapshotId). Reports are cached
 * per snapshot+model in memory, so switching dashboard tabs never re-calls Gemini —
 * only an explicit generate/refresh does. Changing the snapshot resets to idle.
 */
export function AiProvider({
  snapshotId,
  posts,
  prev,
  children,
}: {
  snapshotId: string;
  posts: ConsolidatedPost[];
  prev?: ConsolidatedPost[];
  children: React.ReactNode;
}) {
  const [configured, setConfigured] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<AiReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<AiModelId>(DEFAULT_MODEL);

  const cache = useRef<Map<string, AiReport>>(new Map());

  useEffect(() => {
    let live = true;
    fetchAiStatus().then((s) => {
      if (!live) return;
      setConfigured(s.enabled);
      setModel((m) => m ?? s.defaultModel);
    });
    return () => {
      live = false;
    };
  }, []);

  // Reset when the snapshot changes; restore a cached report if we have one.
  useEffect(() => {
    const cached = cache.current.get(`${snapshotId}:${model}`);
    if (cached) {
      setReport(cached);
      setPhase("ready");
      setError(null);
    } else {
      setReport(null);
      setPhase("idle");
      setError(null);
    }
  }, [snapshotId, model]);

  const generate = useCallback(
    async (force = false) => {
      const cacheKey = `${snapshotId}:${model}`;
      if (!force && cache.current.has(cacheKey)) {
        setReport(cache.current.get(cacheKey)!);
        setPhase("ready");
        return;
      }
      setPhase("loading");
      setError(null);
      try {
        const summary = buildAiSummary(posts, prev);
        const res = await fetchAiReport(summary, model);
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
    [snapshotId, model, posts, prev]
  );

  const value = useMemo<AiState>(
    () => ({ configured, phase, report, error, model, setModel, generate }),
    [configured, phase, report, error, model, generate]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
