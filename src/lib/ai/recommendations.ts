import "server-only";
import { catalogForPrompt } from "@/lib/brand-catalog";
import { TCL_BRIEF_CONTEXT } from "./brief-context";
import { tclVoicePromptFragment } from "./brand-voice";
import { estimateCost, MODELS } from "./pricing";
import type {
  AiBrandRecommendation,
  AiBrandMention,
  AiGroundingSource,
  AiModelId,
  AiUsage,
} from "./types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Fixed flagship recurring formats. 10 of 50 recommendations must use one of
 * these. The remaining 40 are trend / news / cultural moment driven.
 */
const FLAGSHIP_STRUCTURES = [
  "5 Ways I Style One Piece of Luxury — weekly recurring styling series",
  "Multi-brand styling edit — one theme, 3+ brands from our catalog",
  "Investment Dressing spotlight — a single hero piece, ROI storytelling",
  "Luxury Education carousel — real vs dupe, provenance, care guide",
  "Drop Reveal teaser arc — 3-part countdown reel",
  "Occasion Styling guide — wedding, festive, red carpet",
  "Designer Access — Instagram Live 'Ask the Designer'",
  "Brand Craftsmanship story — behind-the-atelier film",
  "Celebrity-Inspired edit — named cultural moment reworked with catalog brands",
  "Luxury Myths vs Facts carousel",
];

const TOTAL_RECS = 30;
const FLAGSHIP_COUNT = 15;
const BATCH_SIZE = 15; // 2 batches of 15 = 30
const MAX_CONCURRENT = 3;

interface BatchSpec {
  batchIndex: number;
  totalBatches: number;
  count: number;
  flagshipQuota: number;
  flagshipPalette: string[];
  usedTrends: string[]; // trends already used in earlier batches (avoid dupes)
}

function buildRecommendationsPrompt(dateStr: string, spec: BatchSpec): string {
  const flagshipInstruction = spec.flagshipQuota > 0
    ? `EXACTLY ${spec.flagshipQuota} of the ${spec.count} recommendations in THIS batch must be flagship recurring formats. Pick each from the palette below, set isFlagshipRecurring=true, and set flagshipStructure to the picked structure name.\n${FLAGSHIP_STRUCTURES.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`
    : `ALL ${spec.count} recommendations in this batch must be trend / news / cultural / seasonal moment driven — NOT flagship recurring. Set isFlagshipRecurring=false.`;

  const dedupeGuard = spec.usedTrends.length
    ? `\n=== TRENDS ALREADY USED (do NOT repeat these across the 50 total; use different named signals) ===\n${spec.usedTrends.map((t) => `- ${t}`).join("\n")}`
    : "";

  return `You are the Senior Creative Director + Social Copy Chief for @tatacliqluxury. You are writing for the marketing team who will EXECUTE these ideas this week. Every idea must sound like it was written in-house — not by a generic AI.

=== BRAND CONTEXT (authoritative) ===
${TCL_BRIEF_CONTEXT}

=== BRAND VOICE — READ EVERY EXEMPLAR BEFORE WRITING ===
${tclVoicePromptFragment(12)}

=== TCL BRAND CATALOG (recommendations MUST only use brands from this list — never invent, never "luxury brands" generically) ===
${catalogForPrompt()}

=== BATCH CONTEXT ===
This is batch ${spec.batchIndex + 1} of ${spec.totalBatches}. Produce ${spec.count} recommendations in this batch. Together with the other batches, the marketing team will receive ${TOTAL_RECS} recommendations for ${dateStr}.
${flagshipInstruction}${dedupeGuard}

=== HARD RULES ===
- BRAND-LEVEL only. Not eCommerce merchandising. Not curator lists. Not catalog copy.
- Every recommendation names 3-6 brands from the catalog with a per-brand rationale — most TCL posts tag 5+ brands.
- Every trend-driven idea references a NAMED live signal (named editorial, named celebrity moment, named event, named cultural moment, named Google Trends spike, named festival, named fashion week collection). Not "trending topic" or "the Y2K aesthetic" — the specific moment.
- Every caption you draft must follow the TCL voice guide above. Not close — exact. Read the exemplars, mirror the structure, mirror the length, mirror the closing pattern.
- No forbidden phrasing: "elevate", "curated for you", "must-have", "shop the look", "unleash", "iconic", "game-changer", "level up", ✨-spam.
- No emoji except a single ✨ where a real TCL caption would use one.

=== LIVE RESEARCH (use Google Search — mandatory) ===
Search across Vogue India, Vogue Business, BoF, WWD, ELLE India, Harper's Bazaar India, GQ India, Hypebeast, Highsnobiety, Vestoj, Google Trends India + global, Fashion Weeks (Paris, Milan, NYFW, LFW, India Couture Week, Lakmé/FDCI, Watches & Wonders), luxury beauty launches, celebrity styling news, current Indian festivals + wedding season windows, r/luxury, TikTok LuxeTok.

=== OUTPUT — JSON only, no markdown ===
{
  "recommendations": [
    {
      "title": "6-10 word editorial headline",
      "format": "Reel | Carousel | Static | Story | Instagram Live | Brand Film",
      "hook": "the FIRST spoken line (for Reels) or the FIRST caption line (for others), in TCL voice",
      "caption": "the FULL caption ready to publish. Follow the exact TCL structure: opening line → 1-2 sentence body → brand credits block (one item per line: 'Outfit: @brand') → 'Explore on Tata CLiQ Luxury.' or 'Link in bio' → optional parenthetical keyword drop. 40-120 words.",
      "creativeConcept": "2-4 sentences: the story arc, the visual, the emotional beat",
      "brandRationale": [
        {"brand":"@catalog_brand","why":"one sentence — why this brand fits this specific idea"}
      ],
      "whyItWillWork": "the strategic reason — tied to a specific data point OR a named live signal",
      "expectedKpiImpact": "concrete expectation e.g. 'Saves +40%, ER +80bps' — grounded in observable patterns",
      "audienceIntent": "the audience mindset — consideration, discovery, transactional, aspiration",
      "expectedAudienceBehaviour": "WHAT the audience will do (save / share / DM / comment / tag) AND WHY — audience psychology, not just metrics",
      "trendConnection": "the NAMED trend / moment / editorial / event this rides",
      "culturalInsight": "the deeper why-this-matters-now read — the cultural or category shift this taps into",
      "executionNotes": "shot list / cinematography / editorial reference (one sentence)",
      "difficulty": "Low | Medium | High",
      "predictedPerformance": "Breakout | Strong | Reliable",
      "isFlagshipRecurring": true | false,
      "flagshipStructure": "only when isFlagshipRecurring"
    }
  ]
}

Rules:
- Return EXACTLY ${spec.count} recommendations in this batch.
- Every "brand" in brandRationale MUST be from the catalog above.
- Every caption MUST pass the TCL voice test — a human at @tatacliqluxury should be able to publish it as-is.
- Be bold and editorial. This is a luxury maison's voice, not a mass-fashion account.`;
}

interface RawUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
}

interface BatchResult {
  recommendations: AiBrandRecommendation[];
  usage: AiUsage;
  groundingSources: AiGroundingSource[];
}

export interface RecsCallResult {
  recommendations: AiBrandRecommendation[];
  usage: AiUsage;
  groundingSources: AiGroundingSource[];
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

function coerceRec(r: Record<string, unknown>): AiBrandRecommendation {
  const brandRat = Array.isArray(r.brandRationale) ? (r.brandRationale as Record<string, unknown>[]) : [];
  const brandRationale: AiBrandMention[] = brandRat.map((x) => ({
    brand: String(x.brand ?? ""),
    why: String(x.why ?? ""),
  })).filter((x) => x.brand);

  // Fallback: if legacy `brands` array is provided but no brandRationale, synthesize.
  const legacyBrands = Array.isArray(r.brands) ? (r.brands as unknown[]).map(String).filter(Boolean) : [];
  const brands = brandRationale.length
    ? brandRationale.map((b) => b.brand)
    : legacyBrands;

  return {
    title: String(r.title ?? ""),
    format: (String(r.format ?? "Reel") as AiBrandRecommendation["format"]) || "Reel",
    hook: String(r.hook ?? ""),
    caption: String(r.caption ?? ""),
    creativeConcept: String(r.creativeConcept ?? r.concept ?? ""),
    concept: String(r.concept ?? r.creativeConcept ?? ""),
    brands,
    brandRationale,
    whyItWillWork: String(r.whyItWillWork ?? ""),
    expectedKpiImpact: String(r.expectedKpiImpact ?? ""),
    audienceIntent: String(r.audienceIntent ?? ""),
    expectedAudienceBehaviour: String(r.expectedAudienceBehaviour ?? ""),
    trendConnection: String(r.trendConnection ?? ""),
    culturalInsight: String(r.culturalInsight ?? ""),
    executionNotes: String(r.executionNotes ?? ""),
    difficulty: (String(r.difficulty ?? "Medium") as AiBrandRecommendation["difficulty"]) || "Medium",
    predictedPerformance: (String(r.predictedPerformance ?? "Reliable") as AiBrandRecommendation["predictedPerformance"]) || "Reliable",
    isFlagshipRecurring: Boolean(r.isFlagshipRecurring),
    flagshipStructure: r.flagshipStructure ? String(r.flagshipStructure) : undefined,
  };
}

async function callOneBatch(model: AiModelId, apiKey: string, dateStr: string, spec: BatchSpec): Promise<BatchResult> {
  const body = {
    contents: [{ role: "user", parts: [{ text: buildRecommendationsPrompt(dateStr, spec) }] }],
    tools: [{ google_search: {} }],
    // Temperature > 1 per the brief. Gemini accepts 0-2; 1.3 lands in bold-editorial territory
    // without going incoherent. topP kept high for word-choice variety.
    generationConfig: { temperature: 1.3, topP: 0.98, maxOutputTokens: 16384 },
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
  const rawRecs = Array.isArray(parsed.recommendations) ? (parsed.recommendations as Record<string, unknown>[]) : [];
  const recommendations = rawRecs.map(coerceRec);

  const gm = candidate?.groundingMetadata ?? {};
  const chunks: { web?: { uri?: string; title?: string } }[] = gm.groundingChunks ?? [];
  const groundingSources: AiGroundingSource[] = chunks
    .map((c) => ({ title: c.web?.title ?? "", url: c.web?.uri ?? "" }))
    .filter((s) => s.url)
    .slice(0, 10);
  const groundingQueries = (gm.webSearchQueries ?? []).length;

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

  return { recommendations, usage, groundingSources };
}

/**
 * Orchestrates the 50-recommendation output across 3 sequential batches. Sequential
 * (not parallel) so batch N can be told which trends batch 1..N-1 already used,
 * preventing the model from repeating "Diwali gifting" 12 times across batches.
 */
export async function callRecommendations(model: AiModelId, apiKey: string, dateStr: string): Promise<RecsCallResult> {
  // Split flagship quota across batches. 10 flagship total → batch 1 gets 4, batches 2/3 get 3.
  const batchSizes = [BATCH_SIZE, TOTAL_RECS - BATCH_SIZE];
  const flagshipQuotas = [8, 7]; // 15 flagship total across 2 batches
  const totalBatches = batchSizes.length;

  const all: AiBrandRecommendation[] = [];
  let mergedUsage: AiUsage = {
    model: MODELS[model].label,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    groundingQueries: 0,
    estimatedCostUsd: 0,
    costBreakdown: { input: 0, output: 0, grounding: 0 },
  };
  const sourceMap = new Map<string, AiGroundingSource>();
  const usedTrends: string[] = [];

  for (let i = 0; i < totalBatches; i++) {
    const spec: BatchSpec = {
      batchIndex: i,
      totalBatches,
      count: batchSizes[i],
      flagshipQuota: flagshipQuotas[i],
      flagshipPalette: FLAGSHIP_STRUCTURES,
      usedTrends: [...usedTrends],
    };
    // eslint-disable-next-line no-await-in-loop
    const r = await callOneBatch(model, apiKey, dateStr, spec);
    all.push(...r.recommendations);
    for (const s of r.groundingSources) if (s.url && !sourceMap.has(s.url)) sourceMap.set(s.url, s);
    // Track trends this batch used so the next batch can avoid dupes
    for (const rec of r.recommendations) {
      if (rec.trendConnection && !usedTrends.includes(rec.trendConnection)) usedTrends.push(rec.trendConnection);
    }
    // Sum usage
    const cbA = mergedUsage.costBreakdown ?? { input: 0, output: 0, grounding: 0 };
    const cbB = r.usage.costBreakdown ?? { input: 0, output: 0, grounding: 0 };
    mergedUsage = {
      model: r.usage.model,
      inputTokens: mergedUsage.inputTokens + r.usage.inputTokens,
      outputTokens: mergedUsage.outputTokens + r.usage.outputTokens,
      thoughtsTokens: (mergedUsage.thoughtsTokens ?? 0) + (r.usage.thoughtsTokens ?? 0) || undefined,
      totalTokens: mergedUsage.totalTokens + r.usage.totalTokens,
      groundingQueries: mergedUsage.groundingQueries + r.usage.groundingQueries,
      estimatedCostUsd: (mergedUsage.estimatedCostUsd ?? 0) + (r.usage.estimatedCostUsd ?? 0),
      costBreakdown: { input: cbA.input + cbB.input, output: cbA.output + cbB.output, grounding: cbA.grounding + cbB.grounding },
    };
  }

  return {
    recommendations: all.slice(0, TOTAL_RECS),
    usage: mergedUsage,
    groundingSources: Array.from(sourceMap.values()).slice(0, 30),
  };
}
