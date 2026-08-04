import { NextResponse } from "next/server";
import { TCL_BRIEF_CONTEXT } from "@/lib/ai/brief-context";
import { tclVoicePromptFragment } from "@/lib/ai/brand-voice";
import { catalogForPrompt } from "@/lib/brand-catalog";
import { estimateCost, MODELS } from "@/lib/ai/pricing";
import { DEFAULT_MODEL, isValidModel } from "@/lib/ai/pricing";
import type { AiModelId } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface ReviewRequest {
  images: string[];      // base64 data URIs
  caption: string;
  brand?: string;
  historicalContext?: string; // compact summary of dataset stats
}

function buildPrompt(req: ReviewRequest): string {
  const brandLine = req.brand ? `\nSelected brand for this post: ${req.brand}` : "";
  const histLine = req.historicalContext ? `\n=== HISTORICAL PERFORMANCE CONTEXT (from the team's uploaded dataset) ===\n${req.historicalContext}` : "";

  return `You are the Creative Director + Senior Luxury Social Strategist for @tatacliqluxury. A team member is about to publish a post and wants your honest, expert pre-publish review. You are reviewing BEFORE publish — your job is to make this post stronger. Be specific, constructive, and opinionated. Never generic.

=== BRAND CONTEXT ===
${TCL_BRIEF_CONTEXT}

=== TCL VOICE — what on-brand means ===
${tclVoicePromptFragment(8)}

=== BRAND CATALOG ===
${catalogForPrompt()}
${brandLine}
${histLine}

=== LIVE RESEARCH (use Google Search — mandatory) ===
Search current luxury/fashion/cultural trends, competitor recent Instagram posts, and relevant seasonal/cultural windows to ground your advice in reality.

=== COMPETITOR SET (search their recent Instagram posts) ===
Ajio Luxe, Tata CLiQ Fashion, Nykaa Fashion, Farfetch, Net-a-Porter, MyTheresa, SSENSE, Harrods, Selfridges, Browns Fashion

=== CAPTION SUBMITTED ===
${req.caption || "(No caption provided)"}

=== INSTRUCTIONS ===
Review the uploaded creative(s) and caption. Return a SINGLE JSON object:

{
  "overallScore": 0-100,
  "publishRecommendation": "Publish Immediately | Publish after Minor Improvements | Good Concept, Needs Better Execution | Rework Before Publishing | Not Recommended",
  "publishExplanation": "2-3 sentences explaining the verdict",

  "brandVoiceAlignment": {
    "score": 0-100,
    "soundsPremium": "yes/no + one sentence why",
    "soundsEditorial": "yes/no + one sentence why",
    "soundsAspirational": "yes/no + one sentence why",
    "emotionallyEngaging": "yes/no + one sentence why",
    "luxuryFirst": "yes/no + one sentence why",
    "improvements": ["specific improvement 1", "specific improvement 2"]
  },

  "visualReview": {
    "luxuryFeel": "one sentence assessment",
    "composition": "one sentence",
    "typography": "one sentence (if visible)",
    "colourPalette": "one sentence",
    "storytelling": "one sentence",
    "productProminence": "one sentence",
    "premiumPerception": "one sentence",
    "carouselFlow": "one sentence (if multiple slides, else 'N/A')",
    "overallVisualScore": 0-100
  },

  "captionReview": {
    "hookScore": 0-100,
    "flowScore": 0-100,
    "luxuryLanguageScore": 0-100,
    "ctaScore": 0-100,
    "emotionalPullScore": 0-100,
    "shareabilityScore": 0-100,
    "saveabilityScore": 0-100,
    "overallCaptionScore": 0-100,
    "feedback": "2-3 sentences of specific caption feedback",
    "rewrittenCaption": "FULL rewritten caption in TCL voice — ready to publish. Follow the exact TCL structure: opening hook → 1-2 sentence body → brand credits block → close. 40-120 words."
  },

  "trendAlignment": {
    "aligned": true/false,
    "trendName": "the specific named trend",
    "trendStatus": "Growing | Peak | Fading | Emerging",
    "explanation": "2-3 sentences on why this is or isn't trend-aligned and what to do"
  },

  "competitorReview": {
    "similarCompetitorContent": "which competitor recently posted something similar + what they did",
    "whatTheyDidBetter": "one sentence",
    "whatTheyDidDifferently": "one sentence",
    "opportunityMissed": "one sentence on what we could do that they haven't"
  },

  "similarityCheck": {
    "verdict": "Very Unique | Somewhat Similar | Highly Repetitive",
    "explanation": "one sentence on why"
  },

  "audiencePrediction": {
    "estimatedLikes": "range e.g. '800-1,200'",
    "estimatedSaves": "range",
    "estimatedShares": "range",
    "estimatedComments": "range",
    "reachPotential": "Low | Medium | High | Very High",
    "reasoning": "2-3 sentences explaining the prediction"
  },

  "contentImprovements": {
    "betterHook": "specific alternative hook line",
    "betterFirstSlide": "specific suggestion (if carousel)",
    "betterThumbnail": "specific suggestion (if reel/video)",
    "betterCarouselOrder": "specific reorder suggestion (if carousel, else null)",
    "betterCta": "specific alternative CTA",
    "betterLuxuryStorytelling": "one sentence on how to elevate the narrative",
    "betterCopy": "one sentence on copy improvement",
    "betterVisualSequence": "one sentence on visual flow"
  },

  "alternativeConcepts": [
    {
      "hook": "opening line",
      "creativeConcept": "2-3 sentences",
      "caption": "full caption in TCL voice",
      "brands": ["@brand1", "@brand2"],
      "whyBetter": "one sentence on why this would outperform"
    }
  ],

  "culturalOpportunity": {
    "betterMoment": "a named cultural/seasonal moment that would be a better publishing window",
    "explanation": "one sentence"
  },

  "bestTimeToPublish": {
    "day": "e.g. 'Wednesday'",
    "time": "e.g. '6:30 PM IST'",
    "reasoning": "one sentence"
  },

  "finalRecommendation": {
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "biggestOpportunity": "one sentence",
    "biggestRisk": "one sentence",
    "finalVerdict": "2-3 sentence consulting-style final recommendation"
  }
}

Rules:
- 3 alternative concepts, each with a full TCL-voice caption.
- Every score must be justified by a specific observation, not a vibe.
- Be bold and opinionated — this is a Creative Director review, not a dashboard summary.
- The rewritten caption MUST follow TCL voice (exemplars above). Ready to copy-paste and publish.
- Output JSON only.`;
}

function parseJsonBlock(text: string): Record<string, unknown> {
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

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ enabled: false, reason: "GEMINI_API_KEY is not configured." });
  }

  let body: ReviewRequest;
  try {
    body = (await req.json()) as ReviewRequest;
  } catch {
    return NextResponse.json({ enabled: false, reason: "Bad request body." }, { status: 400 });
  }

  const envModel = process.env.GEMINI_MODEL;
  const model: AiModelId = envModel && isValidModel(envModel) ? envModel : DEFAULT_MODEL;
  const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

  // Build multimodal content parts: images first, then the text prompt.
  const parts: Record<string, unknown>[] = [];

  for (const img of (body.images ?? [])) {
    // img is a data URI: "data:image/jpeg;base64,/9j/4AAQ..."
    const match = img.match(/^data:(image\/\w+);base64,(.+)/);
    if (match) {
      parts.push({
        inline_data: {
          mime_type: match[1],
          data: match[2],
        },
      });
    }
  }

  parts.push({ text: buildPrompt(body) });

  const geminiBody = {
    contents: [{ role: "user", parts }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 1.1, topP: 0.95, maxOutputTokens: 16384 },
  };

  try {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(geminiBody),
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

    const raw = data?.usageMetadata ?? {};
    const inputTokens = raw.promptTokenCount ?? 0;
    const thoughts = raw.thoughtsTokenCount ?? 0;
    const outputTokens = (raw.candidatesTokenCount ?? 0) + thoughts;
    const cost = estimateCost({ model, inputTokens, outputTokens, groundingQueries: (candidate?.groundingMetadata?.webSearchQueries ?? []).length });

    return NextResponse.json({
      enabled: true,
      review: parsed,
      model: MODELS[model].label,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: raw.totalTokenCount ?? inputTokens + outputTokens,
        estimatedCostUsd: cost.total,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed.";
    return NextResponse.json({ enabled: false, reason: message }, { status: 502 });
  }
}
