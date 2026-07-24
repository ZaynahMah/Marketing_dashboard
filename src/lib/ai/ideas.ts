import "server-only";
import { catalogForPrompt } from "@/lib/brand-catalog";
import { TCL_BRIEF_CONTEXT } from "./brief-context";
import { estimateCost, MODELS } from "./pricing";
import type { AiContentIdea, AiGroundingSource, AiModelId, AiUsage } from "./types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Prompt for the 15 High-Impact Content Ideas. Deliberately strict:
 *  - broad, current live signals across fashion/luxury/culture
 *  - every idea references a specific real trend/moment/editorial
 *  - brands must come from the CLiQ Luxury catalog only
 *  - fields are short, personal, actionable — no AI filler
 *  - forbidden-phrase list to keep output away from generic advice
 */
function buildIdeasPrompt(dateStr: string): string {
  return `You are the Senior Creative Director + Luxury Social Strategist for Tata CLiQ Luxury. Author FIFTEEN High-Impact Content Ideas for ${dateStr}. Every idea must feel authored by a human creative director, not an AI assistant.

=== BRAND CONTEXT (authoritative voice / register) ===
${TCL_BRIEF_CONTEXT}

=== AVAILABLE BRAND CATALOG (idea.brands MUST come from this list only — do NOT invent brands or use unlisted ones) ===
${catalogForPrompt()}

=== LIVE RESEARCH (use Google Search — mandatory for every idea) ===
Search broadly across current fashion, luxury and culture signals. Do not limit yourself to any one publication. Draw from ALL of these where relevant right now for ${dateStr}:
- Instagram trending keywords in fashion
- Google Trends spikes (India + global luxury)
- Vogue India + Vogue Business, Business of Fashion, WWD, Highsnobiety, Hypebeast, GQ India, ELLE India, Harper's Bazaar India, Vestoj
- Fashion Weeks (Paris, Milan, New York, London), India Couture Week, Lakmé/FDCI
- Cannes Film Festival red carpet moments
- Watches & Wonders launches
- Luxury beauty launches
- Celebrity styling news (India + global)
- Indian festivals ongoing/upcoming this cycle (Diwali, Karva Chauth, wedding season, Raksha Bandhan, Onam, Eid, Christmas, New Year — whichever are current)
- Global festivals / cultural moments live now
- Viral luxury conversations (Reddit r/luxury, TikTok LuxeTok, Substack fashion writing)

Every idea must reference a SPECIFIC real, current thing you found — a named editorial, a named collection at a named fashion week, a named celebrity moment, a named cultural moment, a Google Trends spike. Never write "current trend" or "recent moment" without naming it.

=== FORBIDDEN — DO NOT WRITE ===
Do not use any of these clichés or generic AI phrases:
- "Post more Reels" / "Increase engagement" / "Reach was low"
- "Trending on Instagram" without naming the specific trend
- "Leverage", "elevate", "curated", "authentic storytelling"
- Any idea that could apply to any luxury brand — every idea must be specific to a NAMED brand on our catalog and a NAMED live moment

=== OUTPUT FORMAT ===
Return ONE JSON object, no markdown, no commentary:
{
  "ideas": [
    {
      "title": "6-10 word editorial headline — evocative, specific",
      "hook": "One line — the visual/verbal opening beat",
      "description": "2-3 sentences: what happens in the post, concretely",
      "brands": ["Brand from catalog", "..."],
      "category": "Watches | Fine Jewellery | Fashion & Ready-to-Wear | Handbags & Leather | Footwear | Beauty & Fragrance | Eyewear | Travel & Luggage | Home & Lifestyle | Indian Couture",
      "creativeDirection": "One sentence: cinematography / composition / palette / editorial reference",
      "format": "Reel | Carousel | Static | Story",
      "whyTrendMatters": "The SPECIFIC live signal — name the editorial/event/moment/Google Trends spike",
      "whyTCLShouldPost": "Why THIS brand + THIS moment fits the TCL register and our performance",
      "cta": "Concrete CTA — link in bio to X, DM 'WORD' to receive Y, tap to shop the Z",
      "autoDm": true,
      "liveReference": "Named source (e.g. 'Vogue India Sept 2026 cover — Alia Bhatt in Anita Dongre')"
    }
  ]
}

Rules for the 15 ideas as a set:
- Spread across at least 6 different brand categories.
- Mix formats: aim for 6-8 Reels, 4-5 Carousels, 1-2 Static, 1-2 Story.
- At most 2 ideas from the same brand.
- Include at least 2 Craftsmanship / Brand Stories and 2 Cultural / Seasonal Moments.
- Set autoDm=true only when the idea has a clear DM trigger (guide, list, look-book, price/availability) — otherwise false.

Output the JSON only. Concise. Specific. No AI voice.`;
}

interface RawUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
}

export interface IdeasCallResult {
  ideas: AiContentIdea[];
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

export async function callIdeas(model: AiModelId, apiKey: string, dateStr: string): Promise<IdeasCallResult> {
  const body = {
    contents: [{ role: "user", parts: [{ text: buildIdeasPrompt(dateStr) }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.85, topP: 0.95, maxOutputTokens: 8192 },
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
  const rawIdeas = Array.isArray(parsed.ideas) ? (parsed.ideas as Record<string, unknown>[]) : [];
  const ideas: AiContentIdea[] = rawIdeas.map((r) => ({
    title: String(r.title ?? ""),
    hook: String(r.hook ?? ""),
    description: String(r.description ?? ""),
    brands: Array.isArray(r.brands) ? (r.brands as unknown[]).map(String) : [],
    category: String(r.category ?? ""),
    creativeDirection: String(r.creativeDirection ?? ""),
    format: (String(r.format ?? "Reel") as AiContentIdea["format"]) || "Reel",
    whyTrendMatters: String(r.whyTrendMatters ?? ""),
    whyTCLShouldPost: String(r.whyTCLShouldPost ?? ""),
    cta: String(r.cta ?? ""),
    autoDm: Boolean(r.autoDm),
    liveReference: r.liveReference ? String(r.liveReference) : undefined,
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

  return { ideas, usage, groundingSources };
}
