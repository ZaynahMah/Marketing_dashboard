import { NextResponse } from "next/server";
import { callAnalysisBatched } from "@/lib/ai/analysis";
import { DEFAULT_MODEL, isValidModel } from "@/lib/ai/pricing";
import type { AiAnalysisResponse, AiModelId } from "@/lib/ai/types";
import type { ViewPost } from "@/lib/view-mode";

export const runtime = "nodejs";
export const maxDuration = 300;

interface CacheEntry {
  key: string;
  result: AiAnalysisResponse;
}
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<AiAnalysisResponse>>();

interface Body {
  snapshotId: string;
  posts: ViewPost[];
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ enabled: false, reason: "GEMINI_API_KEY is not configured." } satisfies AiAnalysisResponse);
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ enabled: false, reason: "Bad request body." } satisfies AiAnalysisResponse, { status: 400 });
  }
  if (!body.posts?.length) {
    return NextResponse.json({ enabled: false, reason: "No posts to analyse." } satisfies AiAnalysisResponse);
  }
  const envModel = process.env.GEMINI_MODEL;
  const model: AiModelId = envModel && isValidModel(envModel) ? envModel : DEFAULT_MODEL;
  const key = `${body.snapshotId}::${model}`;

  if (cache.has(key)) return NextResponse.json(cache.get(key)!.result);
  if (inFlight.has(key)) {
    const result = await inFlight.get(key)!;
    return NextResponse.json(result);
  }

  const promise = (async () => {
    try {
      const { postAnalyses, continueStopStart, usage, groundingSources } = await callAnalysisBatched(model, apiKey, body.posts);
      const result: AiAnalysisResponse = {
        enabled: true,
        generatedAt: new Date().toISOString(),
        postAnalyses,
        continueStopStart: continueStopStart ?? undefined,
        model: usage.model,
        usage,
        groundingSources,
      };
      cache.set(key, { key, result });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed.";
      return { enabled: false, reason: message } satisfies AiAnalysisResponse;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, promise);
  const result = await promise;
  return NextResponse.json(result);
}
