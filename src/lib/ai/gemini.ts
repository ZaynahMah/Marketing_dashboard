/**
 * Server-only Gemini caller. Never import this into a client component — it uses
 * the API key which must stay on the server (Vercel env var GEMINI_API_KEY).
 *
 * Uses the Gemini Developer API (generativelanguage.googleapis.com) with Google
 * Search grounding enabled so recommendations reflect live, India-relevant signals.
 */
import "server-only";
import { estimateCost, MODELS } from "./pricing";
import type { AiGroundingSource, AiModelId, AiReport, AiSummary, AiUsage } from "./types";

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
  apiKey: string
): Promise<AiReport> {
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    // Google Search grounding → live web signals. (Cannot be combined with forced
    // JSON response mode, so we parse a JSON block out of the text ourselves.)
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
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

  // Grounding metadata → sources + query count.
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
    usage,
  };
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Extract the JSON object from a possibly fenced / prose-wrapped response. */
function parseJsonBlock(text: string): Record<string, any> {
  if (!text) return {};
  let t = text.trim();
  // Strip ```json … ``` fences if present.
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // Otherwise slice from first { to last }.
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
