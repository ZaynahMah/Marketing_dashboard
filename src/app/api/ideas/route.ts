import { NextResponse } from "next/server";
import { callIdeas } from "@/lib/ai/ideas";
import { DEFAULT_MODEL, isValidModel } from "@/lib/ai/pricing";
import type { AiContentIdea, AiGroundingSource, AiIdeasResponse, AiModelId, AiUsage } from "@/lib/ai/types";

export const runtime = "nodejs";
// Cache the response for 12 hours at Vercel's edge as a second line of defence.
// The in-memory day cache below is the primary limiter.
export const revalidate = 43200;

interface CacheEntry {
  dateStr: string;
  generatedAt: string;
  ideas: AiContentIdea[];
  model: string;
  usage: AiUsage;
  groundingSources: AiGroundingSource[];
}

// Module-scoped: warm instances reuse the same day cache; cold starts refill once.
let dailyCache: CacheEntry | null = null;
let inFlight: Promise<CacheEntry> | null = null;

function todayIST(): string {
  // TCL is an India brand — the "day" is IST regardless of Vercel region.
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
    return NextResponse.json({ enabled: false, reason: "GEMINI_API_KEY is not configured." } satisfies AiIdeasResponse, {
      status: 200,
    });
  }
  const envModel = process.env.GEMINI_MODEL;
  const model: AiModelId = envModel && isValidModel(envModel) ? envModel : DEFAULT_MODEL;
  const dateStr = todayIST();

  // Fast path: today's ideas already in memory.
  if (dailyCache && dailyCache.dateStr === dateStr) {
    return NextResponse.json({
      enabled: true,
      fromCache: true,
      generatedFor: dailyCache.dateStr,
      generatedAt: dailyCache.generatedAt,
      cachedUntil: nextMidnightIsoUtc(),
      ideas: dailyCache.ideas,
      model: dailyCache.model,
      usage: dailyCache.usage,
      groundingSources: dailyCache.groundingSources,
    } satisfies AiIdeasResponse);
  }

  // De-dup: coalesce concurrent requests into a single Gemini call.
  if (!inFlight) {
    inFlight = (async () => {
      try {
        const { ideas, usage, groundingSources } = await callIdeas(model, apiKey, dateStr);
        const entry: CacheEntry = {
          dateStr,
          generatedAt: new Date().toISOString(),
          ideas,
          model: usage.model,
          usage,
          groundingSources,
        };
        dailyCache = entry;
        return entry;
      } finally {
        // Release the in-flight slot only after cache is written (success path)
        // OR immediately on throw so the next request can retry.
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
      ideas: entry.ideas,
      model: entry.model,
      usage: entry.usage,
      groundingSources: entry.groundingSources,
    } satisfies AiIdeasResponse);
  } catch (err) {
    inFlight = null;
    const message = err instanceof Error ? err.message : "Ideas generation failed.";
    return NextResponse.json({ enabled: false, reason: message } satisfies AiIdeasResponse, { status: 502 });
  }
}
