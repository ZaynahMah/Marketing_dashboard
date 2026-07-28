import { NextResponse } from "next/server";
import { callRecommendations } from "@/lib/ai/recommendations";
import { DEFAULT_MODEL, isValidModel } from "@/lib/ai/pricing";
import type { AiBrandRecommendation, AiGroundingSource, AiModelId, AiRecommendationsResponse, AiUsage } from "@/lib/ai/types";

export const runtime = "nodejs";
export const revalidate = 43200;

interface CacheEntry {
  dateStr: string;
  generatedAt: string;
  recommendations: AiBrandRecommendation[];
  model: string;
  usage: AiUsage;
  groundingSources: AiGroundingSource[];
}

let dailyCache: CacheEntry | null = null;
let inFlight: Promise<CacheEntry> | null = null;

function todayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}
function nextMidnightIsoUtc(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setUTCHours(0, 0, 0, 0);
  ist.setUTCDate(ist.getUTCDate() + 1);
  return new Date(ist.getTime() - 5.5 * 60 * 60 * 1000).toISOString();
}

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ enabled: false, reason: "GEMINI_API_KEY is not configured." } satisfies AiRecommendationsResponse);
  }
  const envModel = process.env.GEMINI_MODEL;
  const model: AiModelId = envModel && isValidModel(envModel) ? envModel : DEFAULT_MODEL;
  const dateStr = todayIST();

  if (dailyCache && dailyCache.dateStr === dateStr) {
    return NextResponse.json({
      enabled: true,
      fromCache: true,
      generatedFor: dailyCache.dateStr,
      generatedAt: dailyCache.generatedAt,
      cachedUntil: nextMidnightIsoUtc(),
      recommendations: dailyCache.recommendations,
      model: dailyCache.model,
      usage: dailyCache.usage,
      groundingSources: dailyCache.groundingSources,
    } satisfies AiRecommendationsResponse);
  }

  if (!inFlight) {
    inFlight = (async () => {
      try {
        const { recommendations, usage, groundingSources } = await callRecommendations(model, apiKey, dateStr);
        const entry: CacheEntry = {
          dateStr,
          generatedAt: new Date().toISOString(),
          recommendations,
          model: usage.model,
          usage,
          groundingSources,
        };
        dailyCache = entry;
        return entry;
      } finally {
        setTimeout(() => (inFlight = null), 0);
      }
    })();
  }

  try {
    const entry = await inFlight;
    return NextResponse.json({
      enabled: true,
      fromCache: false,
      generatedFor: entry.dateStr,
      generatedAt: entry.generatedAt,
      cachedUntil: nextMidnightIsoUtc(),
      recommendations: entry.recommendations,
      model: entry.model,
      usage: entry.usage,
      groundingSources: entry.groundingSources,
    } satisfies AiRecommendationsResponse);
  } catch (err) {
    inFlight = null;
    const message = err instanceof Error ? err.message : "Recommendations generation failed.";
    return NextResponse.json({ enabled: false, reason: message } satisfies AiRecommendationsResponse, { status: 502 });
  }
}
