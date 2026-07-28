import "server-only";
import { catalogForPrompt } from "@/lib/brand-catalog";
import { TCL_BRIEF_CONTEXT } from "./brief-context";
import { estimateCost, MODELS } from "./pricing";
import type { AiBrandRecommendation, AiGroundingSource, AiModelId, AiUsage } from "./types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const FLAGSHIP_STRUCTURES = [
  "Multi-brand styling edit (one theme, 3+ brands from our catalog)",
  "5 Ways I Style One Luxury Piece — recurring style series",
  "Investment Dressing spotlight (a single hero piece; ROI storytelling)",
  "Luxury Education carousel (myth vs fact, care guide, provenance)",
  "Drop Reveal teaser arc (3-part countdown reel)",
  "Occasion Styling guide (wedding season, festive, red carpet)",
  "Designer Access session (Instagram Live or Brand Film)",
  "Brand Craftsmanship story (behind-the-atelier film)",
  "Celebrity-Inspired edit (named cultural moment reworked with catalog brands)",
  "Luxury Myths vs Facts carousel",
];

function buildRecommendationsPrompt(dateStr: string): string {
  return `You are the Senior Creative Director + Luxury Social Strategist for Tata CLiQ Luxury (TCL). Author TWENTY brand-level content recommendations for ${dateStr}. Each must feel authored by a human creative director — never an AI assistant.

=== BRAND CONTEXT (authoritative voice / register) ===
${TCL_BRIEF_CONTEXT}

=== TCL BRAND CATALOG (recommendations MUST only use brands from this list — never invent, never say "luxury brands" generically) ===
${catalogForPrompt()}

=== HARD RULES ===
- Recommendations are BRAND-LEVEL only. Not eCommerce merchandising. Not product-catalog copy. Not curator lists.
- Every recommendation must name 1-3 brands from the catalog. Never brands we don't carry.
- Of the 20, EXACTLY 7 must be "flagship recurring format" recommendations — pick from this palette:
${FLAGSHIP_STRUCTURES.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
  Set isFlagshipRecurring=true and flagshipStructure to the chosen structure name for these 7.
- The other 13 are trend-anchored one-offs (isFlagshipRecurring=false, flagshipStructure omitted).

=== LIVE RESEARCH (use Google Search — mandatory) ===
Every recommendation must reference a NAMED live signal — a specific current editorial, fashion week collection, celebrity moment, seasonal moment, Google Trends spike, or platform trend. Search across:
- Vogue India, Vogue Business, BoF, WWD, ELLE India, Harper's Bazaar India, GQ India, Hypebeast, Highsnobiety, Vestoj
- Google Trends (India + global)
- Fashion Weeks (Paris, Milan, NYFW, LFW, India Couture Week, Lakmé/FDCI)
- Watches & Wonders, luxury beauty launches
- Celebrity styling news
- Ongoing Indian festivals (Diwali, Karva Chauth, Raksha Bandhan, Onam, Christmas, wedding season, Valentine's — whichever are live now)
- Cannes red carpet, Met Gala carryover moments
- Viral luxury conversations (r/luxury, TikTok LuxeTok)

=== FORBIDDEN ===
- "Post more Reels" / "Increase engagement" / "leverage" / "elevate" / "curated" / "authentic storytelling"
- Recommendations without a named brand + named live moment
- The same trend cited across more than 2 recommendations
- Merchandising language ("Shop the look", "Best sellers", "Top picks under Rs X")

=== OUTPUT ===
Return ONE JSON object, no markdown:
{
  "recommendations": [
    {
      "title": "6-10 word editorial headline",
      "format": "Reel | Carousel | Static | Story | Instagram Live | Brand Film",
      "hook": "the visual/verbal opening beat, one line",
      "concept": "2-3 sentences on the story of the post",
      "brands": ["catalog brand", "..."],
      "whyItWillWork": "the WHY tied to a specific number (e.g. 'Craftsmanship posts drive 3x saves in the dataset') OR a named live trend",
      "expectedKpiImpact": "concrete expectation e.g. 'Saves +40%, ER +80bps'",
      "audienceIntent": "the audience mindset this taps into — consideration, discovery, transactional, aspiration",
      "trendConnection": "the NAMED trend/moment/editorial this rides",
      "executionNotes": "one sentence on shot list / cinematography / editorial reference",
      "difficulty": "Low | Medium | High",
      "predictedPerformance": "Breakout | Strong | Reliable",
      "isFlagshipRecurring": true | false,
      "flagshipStructure": "only when isFlagshipRecurring; name from the flagship palette above"
    }
  ]
}

Output the JSON only. Twenty items. Seven flagship. All brand-level. All grounded.`;
}

interface RawUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
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

export async function callRecommendations(model: AiModelId, apiKey: string, dateStr: string): Promise<RecsCallResult> {
  const body = {
    contents: [{ role: "user", parts: [{ text: buildRecommendationsPrompt(dateStr) }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.85, topP: 0.95, maxOutputTokens: 12288 },
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
  const recommendations: AiBrandRecommendation[] = rawRecs.map((r) => ({
    title: String(r.title ?? ""),
    format: (String(r.format ?? "Reel") as AiBrandRecommendation["format"]) || "Reel",
    hook: String(r.hook ?? ""),
    concept: String(r.concept ?? ""),
    brands: Array.isArray(r.brands) ? (r.brands as unknown[]).map(String) : [],
    whyItWillWork: String(r.whyItWillWork ?? ""),
    expectedKpiImpact: String(r.expectedKpiImpact ?? ""),
    audienceIntent: String(r.audienceIntent ?? ""),
    trendConnection: String(r.trendConnection ?? ""),
    executionNotes: String(r.executionNotes ?? ""),
    difficulty: (String(r.difficulty ?? "Medium") as AiBrandRecommendation["difficulty"]) || "Medium",
    predictedPerformance: (String(r.predictedPerformance ?? "Reliable") as AiBrandRecommendation["predictedPerformance"]) || "Reliable",
    isFlagshipRecurring: Boolean(r.isFlagshipRecurring),
    flagshipStructure: r.flagshipStructure ? String(r.flagshipStructure) : undefined,
  }));

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
