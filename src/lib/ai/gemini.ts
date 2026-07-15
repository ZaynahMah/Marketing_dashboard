/**
 * Server-only Gemini caller. Never import into a client component — it uses the
 * API key which must stay on the server (Vercel env var GEMINI_API_KEY).
 *
 * One call per report generation. Google Search grounding is on so strategy and
 * trend sections reflect live, India-relevant luxury signals. Numbers are never
 * produced here — the deterministic engine owns those.
 */
import "server-only";
import { estimateCost, MODELS } from "./pricing";
import type { AiGroundingSource, AiModelId, AiReport, AiReportType, AiUsage } from "./types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

interface RawUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
}

export async function callGemini(
  prompt: string,
  model: AiModelId,
  apiKey: string,
  reportType: AiReportType
): Promise<AiReport> {
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 8192 },
  };

  const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const text: string = (candidate?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  const parsed = parseJsonBlock(text);

  const gm = candidate?.groundingMetadata ?? {};
  const queries: string[] = gm.webSearchQueries ?? [];
  const chunks: { web?: { uri?: string; title?: string } }[] = gm.groundingChunks ?? [];
  const groundingSources: AiGroundingSource[] = chunks
    .map((c) => ({ title: c.web?.title ?? "", url: c.web?.uri ?? "" }))
    .filter((s) => s.url)
    .slice(0, 8);
  const groundingQueries = queries.length;

  const raw: RawUsage = data?.usageMetadata ?? {};
  const inputTokens = raw.promptTokenCount ?? 0;
  const thoughts = raw.thoughtsTokenCount ?? 0;
  const outputTokens = (raw.candidatesTokenCount ?? 0) + thoughts;
  const cost = estimateCost({ model, inputTokens, outputTokens, groundingQueries });

  const usage: AiUsage = {
    model: MODELS[model].label,
    inputTokens,
    outputTokens,
    thoughtsTokens: thoughts || undefined,
    totalTokens: raw.totalTokenCount ?? inputTokens + outputTokens,
    groundingQueries,
    estimatedCostUsd: cost.total,
    costBreakdown: { input: cost.input, output: cost.output, grounding: cost.grounding },
  };

  return {
    reportType,
    model: MODELS[model].label,
    generatedAt: new Date().toISOString(),
    grounded: groundingQueries > 0 || groundingSources.length > 0,
    groundingSources,
    executiveSummary: parsed.executiveSummary,
    strategicRecommendations: arr(parsed.strategicRecommendations),
    contentStrategy: arr(parsed.contentStrategy),
    planner: arr(parsed.planner),
    whatToPostNext: arr(parsed.whatToPostNext),
    budgetAllocation: arr(parsed.budgetAllocation),
    emergingOpportunities: arr(parsed.emergingOpportunities),
    weekly: parsed.weekly && typeof parsed.weekly === "object" ? parsed.weekly : undefined,
    monthly: parsed.monthly && typeof parsed.monthly === "object" ? parsed.monthly : undefined,
    usage,
  };
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function parseJsonBlock(text: string): Record<string, any> {
  if (!text) return {};
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  if (!t.startsWith("{")) {
    const first = t.indexOf("{");
    const last = t.lastIndexOf("}");
    if (first >= 0 && last > first) t = t.slice(first, last + 1);
  }
  try {
    return JSON.parse(t);
  } catch {
    return {};
  }
}
