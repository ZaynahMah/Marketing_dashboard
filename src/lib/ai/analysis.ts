import "server-only";
import { TCL_BRIEF_CONTEXT } from "./brief-context";
import { tclVoicePromptFragment } from "./brand-voice";
import { estimateCost, MODELS } from "./pricing";
import type { AiContinueStopStart, AiGroundingSource, AiModelId, AiPostAnalysis, AiUsage } from "./types";
import type { ViewPost } from "@/lib/view-mode";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const ALLOWED_VERDICTS = [
  "Scale Immediately",
  "Repeat",
  "Improve Hook",
  "Reduce Frequency",
  "Needs Better CTA",
  "High Reach Low Engagement",
  "High Saves",
  "Evergreen",
  "Weak Performer",
];

/**
 * Sends a compact post-level snapshot (never the raw CSV) to Gemini and asks
 * for a DEEP senior-strategist read on every post plus a Continue/Stop/Start
 * summary. The read must go beyond numbers — trend alignment, creative
 * differentiation, storytelling, caption effectiveness, brand positioning,
 * visual narrative, CTA quality, timing, and cultural relevance.
 */
function buildAnalysisPrompt(posts: ViewPost[]): string {
  const rows = posts.map((p, i) => ({
      i,
      shortcode: p.shortcode,
      date: p.publishTime ?? "",
      description: (p.description || "").slice(0, 320),
      format: p.format,
      bucket: p.contentBucket,
      reach: p.reach ?? 0,
      views: p.views ?? 0,
      saves: p.saves ?? 0,
      shares: p.shares ?? 0,
      comments: p.comments ?? 0,
      likes: p.likes ?? 0,
      interactions: p.interactions ?? 0,
      follows: p.follows ?? 0,
      spend: p.spend ?? 0,
      er: p.er,
      cpr: p.cpr,
      cpe: p.cpe,
      cpv: p.cpv,
    }));

  return `You are a Senior Luxury Brand Strategist writing an in-depth read on every post published by @tatacliqluxury. The marketing team will use your reads to plan next week's content. Every read must sound like it came from a human strategist with 10 years in luxury social — not a dashboard summarizer.

=== BRAND CONTEXT ===
${TCL_BRIEF_CONTEXT}

=== TCL VOICE — WHAT "ON-BRAND" MEANS ===
${tclVoicePromptFragment(8)}

=== POST DATA (GROUND TRUTH — DO NOT RECOMPUTE) ===
${JSON.stringify(rows)}

=== LIVE RESEARCH (use Google Search — mandatory) ===
For each post, consider what was happening in luxury / fashion / culture in the WEEK the post went live. Ground trend / timing reads in named cultural moments, named editorials, named celebrity styling, named campaigns. Not "the trend at the time" — the specific trend, named.

=== ANALYSIS DIMENSIONS — you MUST reason across all of these ===
The verdict is only the closing line. The real work is the read. For each post, independently reason about:
1. Trend alignment — did the content ride an active trend that week? Which one, named?
2. Creative differentiation — was the idea genuinely fresh, or a rerun of a pattern the feed has seen many times?
3. Storytelling quality — was there a real narrative? A beginning-middle-end? Or was it a product callout with a photo?
4. Caption effectiveness — does the caption open with a real hook? Land the brand credits cleanly? Close well? Or is it generic?
5. Brand positioning — did the post REINFORCE the luxury signal (scarcity, intentionality, curation) or DILUTE it (mass-market abundance, discount-led)?
6. Emotional appeal — what emotion did the post reach for? Aspiration, belonging, humour, awe, envy? Did it land?
7. Luxury perception — did this feel like Vogue, or like a category-page banner?
8. Audience relevance — right audience, right week? Or misaligned?
9. Visual narrative — composition, colour story, framing — luxury-grade or catalogue-grade?
10. Call-to-action quality — soft and confident (TCL voice) or hard-sell?
11. Timing — right day, right week, right festival window?
12. Seasonal / cultural relevance — did it tap the correct cultural window (wedding season, festive, back-to-office, monsoon)?
13. Content-format suitability — did the story fit the format, or was it forced?
14. Overall creative execution — polish, discipline, restraint.

=== FORBIDDEN ===
- "Reach was low" / "Engagement was low" / "Post more Reels" / "Increase engagement" / any restated metric as a reason
- Template phrasing that could apply to any post ("This post did well because of good engagement")
- The same reasoning re-used across two posts — every post gets a UNIQUE read
- Generic AI advice ("elevate", "leverage", "curated storytelling", "authentic content")

=== SPECIFICITY BAR ===
Every "whyItWorked" or "whyItFailed" must name at least TWO of: the specific hook design, the named cultural moment, the product / bucket + format fit, a named creator or brand cast, a specific audience behaviour observed, a competitive gap, the storytelling register, an execution detail.

=== OUTPUT — JSON only, no markdown ===
{
  "postAnalyses": [
    {
      "shortcode": "exact shortcode from input",
      "whyItWorked": "if performance is above the dataset median: one specific paragraph naming 2+ creative reasons and the audience psychology behind them. If not: empty string.",
      "whyItFailed": "if performance is below the dataset median: one specific paragraph naming 2+ creative reasons — beyond the numbers. If not: empty string.",
      "audienceBehaviourTriggered": "what the audience actually DID (saved for reference, shared as social currency, tagged a friend for a wedding, scrolled past because it felt like an ad, converted to profile visits, etc.) and WHY they did it",
      "supportingMetrics": "the specific numbers — 'ER 4.2%, Saves 189 vs median 42, Shares 61 vs median 12'",
      "trendAlignment": "did this ride an active trend in its posting week? Name it. If not, say the post was trend-independent OR trend-late.",
      "creativeDifferentiation": "was the idea fresh, or a repeat of a pattern the account has run many times? Be specific.",
      "storytellingQuality": "was there a real narrative? What was the arc? Or was it a product callout?",
      "captionEffectiveness": "one sentence on hook line, brand credits, close. Reference the TCL voice guide.",
      "brandPositioning": "did this REINFORCE luxury positioning (scarcity / intentionality / curation) or DILUTE it (mass volume / discount-led)?",
      "visualNarrative": "one sentence on composition, colour, framing, luxury polish",
      "ctaQuality": "was the CTA soft-confident (TCL) or hard-sell? Where did it land?",
      "timingAndCulturalRelevance": "was the posting week aligned with a cultural / seasonal moment? Which one?",
      "keyLearning": "the ONE thing the marketing team should remember for next week",
      "predictableFutureOpportunity": "a specific, named future post/theme this teaches — brand, angle, occasion",
      "recommendedNextIteration": "concrete next version — brand cast, hook rewrite, format change, timing shift",
      "whatToRepeat": "one concrete pattern to reuse (only meaningful for winners; can be empty for losers)",
      "whatToImprove": "one concrete fix — hook, cast, timing, format, register",
      "whatToAvoid": "what NOT to do again",
      "confidenceScore": 0-100,
      "verdict": "ONE of: ${ALLOWED_VERDICTS.join(", ")}"
    }
  ],
  "continueStopStart": {
    "continueDoing": [{"point":"specific pattern working now, in TCL register","metric":"supporting number"}],
    "stopDoing": [{"point":"specific pattern failing now","metric":"supporting number"}],
    "startDoing": [{"point":"specific new pattern to try, informed by the reads above","metric":"data-anchored rationale"}]
  }
}
Rules:
- Include an entry for EVERY post in the input, using the exact shortcode from the input.
- 3-5 items per continueDoing / stopDoing / startDoing.
- Every metric must be an actual number from the input.
- Every read must be UNIQUE — no template reuse across posts.
- Output the JSON only.`;
}

interface RawUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
}

export interface AnalysisCallResult {
  postAnalyses: AiPostAnalysis[];
  continueStopStart: AiContinueStopStart | null;
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

export async function callAnalysis(model: AiModelId, apiKey: string, posts: ViewPost[]): Promise<AnalysisCallResult> {
  const body = {
    contents: [{ role: "user", parts: [{ text: buildAnalysisPrompt(posts) }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 1.1, topP: 0.95, maxOutputTokens: 20480 },
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

  const rawA = Array.isArray(parsed.postAnalyses) ? (parsed.postAnalyses as Record<string, unknown>[]) : [];
  const asStr = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    return s === "undefined" || s === "null" ? "" : s;
  };
  const postAnalyses: AiPostAnalysis[] = rawA.map((r) => ({
    shortcode: asStr(r.shortcode),
    whyItWorked: asStr(r.whyItWorked),
    whyItFailed: asStr(r.whyItFailed),
    audienceBehaviourTriggered: asStr(r.audienceBehaviourTriggered),
    supportingMetrics: asStr(r.supportingMetrics),
    keyLearning: asStr(r.keyLearning),
    predictableFutureOpportunity: asStr(r.predictableFutureOpportunity),
    recommendedNextIteration: asStr(r.recommendedNextIteration),
    trendAlignment: asStr(r.trendAlignment),
    creativeDifferentiation: asStr(r.creativeDifferentiation),
    storytellingQuality: asStr(r.storytellingQuality),
    captionEffectiveness: asStr(r.captionEffectiveness),
    brandPositioning: asStr(r.brandPositioning),
    visualNarrative: asStr(r.visualNarrative),
    ctaQuality: asStr(r.ctaQuality),
    timingAndCulturalRelevance: asStr(r.timingAndCulturalRelevance),
    whatToRepeat: asStr(r.whatToRepeat),
    whatToImprove: asStr(r.whatToImprove),
    whatToAvoid: asStr(r.whatToAvoid),
    confidenceScore: Number(r.confidenceScore ?? 50),
    verdict: (() => {
      const v = asStr(r.verdict);
      return ALLOWED_VERDICTS.includes(v) ? v : "Weak Performer";
    })(),
  }));

  let continueStopStart: AiContinueStopStart | null = null;
  const css = parsed.continueStopStart as Record<string, unknown> | undefined;
  if (css) {
    const cast = (arr: unknown): { point: string; metric: string }[] =>
      Array.isArray(arr)
        ? (arr as Record<string, unknown>[]).map((x) => ({ point: String(x.point ?? ""), metric: String(x.metric ?? "") }))
        : [];
    continueStopStart = {
      continueDoing: cast(css.continueDoing),
      stopDoing: cast(css.stopDoing),
      startDoing: cast(css.startDoing),
    };
  }

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

  return { postAnalyses, continueStopStart, usage, groundingSources };
}

/**
 * Batched analysis — splits the dataset so EVERY post gets an AI read, not just
 * the first 40. Batches of ~25 keep each call well within the model's output
 * budget while running in parallel to keep wall-clock time down.
 * The per-batch Continue/Stop/Start reads are concatenated then trimmed.
 */
const BATCH_SIZE = 25;
const MAX_CONCURRENT = 4;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (t: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function pull() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, pull);
  await Promise.all(runners);
  return results;
}

export async function callAnalysisBatched(model: AiModelId, apiKey: string, posts: ViewPost[]): Promise<AnalysisCallResult> {
  const batches = chunk(posts, BATCH_SIZE);
  const batchResults = await runWithConcurrency(batches, MAX_CONCURRENT, (b) => callAnalysis(model, apiKey, b));

  // Merge per-post analyses. Guard against dupes across batch boundaries (shouldn't happen but cheap safety).
  const seen = new Set<string>();
  const postAnalyses: AiPostAnalysis[] = [];
  for (const r of batchResults) {
    for (const a of r.postAnalyses) {
      if (a.shortcode && !seen.has(a.shortcode)) {
        seen.add(a.shortcode);
        postAnalyses.push(a);
      }
    }
  }

  // Continue/Stop/Start: concatenate across batches, dedupe by point, trim to 6 per column.
  const mergedCss: AiContinueStopStart = { continueDoing: [], stopDoing: [], startDoing: [] };
  for (const r of batchResults) {
    if (!r.continueStopStart) continue;
    for (const b of r.continueStopStart.continueDoing) if (b.point) mergedCss.continueDoing.push(b);
    for (const b of r.continueStopStart.stopDoing) if (b.point) mergedCss.stopDoing.push(b);
    for (const b of r.continueStopStart.startDoing) if (b.point) mergedCss.startDoing.push(b);
  }
  const trim = (arr: { point: string; metric: string }[]) => {
    const dedup = new Map<string, { point: string; metric: string }>();
    for (const b of arr) if (!dedup.has(b.point)) dedup.set(b.point, b);
    return Array.from(dedup.values()).slice(0, 6);
  };
  mergedCss.continueDoing = trim(mergedCss.continueDoing);
  mergedCss.stopDoing = trim(mergedCss.stopDoing);
  mergedCss.startDoing = trim(mergedCss.startDoing);

  // Sum usage across batches, merge grounding sources (dedupe by URL, cap 20).
  const usage: AiUsage = batchResults.reduce<AiUsage>(
    (acc, r) => {
      const cb = acc.costBreakdown ?? { input: 0, output: 0, grounding: 0 };
      const rb = r.usage.costBreakdown ?? { input: 0, output: 0, grounding: 0 };
      return {
        model: r.usage.model,
        inputTokens: acc.inputTokens + r.usage.inputTokens,
        outputTokens: acc.outputTokens + r.usage.outputTokens,
        thoughtsTokens: (acc.thoughtsTokens ?? 0) + (r.usage.thoughtsTokens ?? 0) || undefined,
        totalTokens: acc.totalTokens + r.usage.totalTokens,
        groundingQueries: acc.groundingQueries + r.usage.groundingQueries,
        estimatedCostUsd: (acc.estimatedCostUsd ?? 0) + (r.usage.estimatedCostUsd ?? 0),
        costBreakdown: {
          input: cb.input + rb.input,
          output: cb.output + rb.output,
          grounding: cb.grounding + rb.grounding,
        },
      };
    },
    { model: "", inputTokens: 0, outputTokens: 0, totalTokens: 0, groundingQueries: 0, estimatedCostUsd: 0, costBreakdown: { input: 0, output: 0, grounding: 0 } },
  );

  const sourceMap = new Map<string, AiGroundingSource>();
  for (const r of batchResults) for (const s of r.groundingSources) if (s.url && !sourceMap.has(s.url)) sourceMap.set(s.url, s);
  const groundingSources = Array.from(sourceMap.values()).slice(0, 20);

  return { postAnalyses, continueStopStart: mergedCss, usage, groundingSources };
}
