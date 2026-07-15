"use client";
/** Client helpers that talk to /api/ai. No API key here — it stays server-side. */
import type { AiModelId, AiResponse, AiStatus, AiSummary } from "./types";

export async function fetchAiStatus(): Promise<AiStatus> {
  try {
    const res = await fetch("/api/ai", { method: "GET" });
    if (!res.ok) return { enabled: false, defaultModel: "gemini-2.5-flash" };
    return (await res.json()) as AiStatus;
  } catch {
    return { enabled: false, defaultModel: "gemini-2.5-flash" };
  }
}

export async function fetchAiReport(summary: AiSummary, model: AiModelId): Promise<AiResponse> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summary, model }),
  });
  return (await res.json()) as AiResponse;
}
