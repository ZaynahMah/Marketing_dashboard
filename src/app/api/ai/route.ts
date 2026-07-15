/**
 * POST /api/ai   → generate the strategy report (server-side; holds the API key)
 * GET  /api/ai   → status probe (is a key configured? what's the default model?)
 *
 * The GEMINI_API_KEY lives only here, server-side, set as a Vercel env var. If it's
 * absent, the endpoint reports disabled and the dashboard falls back to its
 * deterministic recommendations — nothing else breaks.
 */
import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/ai/gemini";
import { buildStrategyPrompt, buildWeeklyPrompt, buildMonthlyPrompt } from "@/lib/ai/prompt";
import { TCL_BRIEF_CONTEXT } from "@/lib/ai/brief-context";
import { DEFAULT_MODEL, isValidModel } from "@/lib/ai/pricing";
import type { AiReportType, AiResponse, AiStatus, AiSummary } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function apiKey(): string | null {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

export async function GET() {
  const status: AiStatus = { enabled: !!apiKey(), defaultModel: DEFAULT_MODEL };
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  const key = apiKey();
  if (!key) {
    const body: AiResponse = { enabled: false, reason: "No GEMINI_API_KEY configured." };
    return NextResponse.json(body, { status: 200 });
  }

  let payload: { summary?: AiSummary; model?: string; reportType?: AiReportType };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ enabled: false, reason: "Invalid request body." } satisfies AiResponse, { status: 400 });
  }

  if (!payload?.summary) {
    return NextResponse.json({ enabled: false, reason: "Missing analytics summary." } satisfies AiResponse, { status: 400 });
  }

  const model = payload.model && isValidModel(payload.model) ? payload.model : DEFAULT_MODEL;
  const reportType: AiReportType =
    payload.reportType === "weekly" || payload.reportType === "monthly" ? payload.reportType : "daily";
  const prompt =
    reportType === "weekly"
      ? buildWeeklyPrompt(payload.summary, TCL_BRIEF_CONTEXT)
      : reportType === "monthly"
      ? buildMonthlyPrompt(payload.summary, TCL_BRIEF_CONTEXT)
      : buildStrategyPrompt(payload.summary, TCL_BRIEF_CONTEXT);

  try {
    const report = await callGemini(prompt, model, key, reportType);
    return NextResponse.json({ enabled: true, report } satisfies AiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini request failed.";
    return NextResponse.json({ enabled: false, reason: message } satisfies AiResponse, { status: 502 });
  }
}
