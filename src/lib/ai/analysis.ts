import "server-only";
import { TCL_BRIEF_CONTEXT } from "./brief-context";
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
 * Sends a compact post-level snapshot (never the raw CSV) to Gemini and asks for
 * a per-post read + Continue/Stop/Start summary. Grounded via Google Search so
 * the "why it worked" reads can reference concurrent cultural moments.
 */
function buildAnalysisPrompt(posts: ViewPost[]): string {
  const rows = posts.map((p, i) => ({
      i,
      shortcode: p.shortcode,
      date: p.publishTime ?? "",
      description: (p.description || "").slice(0, 240),
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

  return `You are a senior luxury social intelligence analyst working for Tata CLiQ Luxury. Perform a DEEP post-level read on every post in the supplied dataset.

=== BRAND CONTEXT (authoritative voice / register) ===
${TCL_BRIEF_CONTEXT}

=== POST DATA (GROUND TRUTH — DO NOT RECOMPUTE) ===
${JSON.stringify(rows)}

=== LIVE RESEARCH (use Google Search where it helps) ===
When explaining WHY a post worked or failed, ground the "why" in real, current signals — a named cultural moment, a real celebrity styling, a benchmark editorial, a specific competitor move. Never generic AI observations.

=== FORBIDDEN ===
- "Reach was low", "Engagement was low", "Post more Reels", "Increase engagement"
- Restating a number as its own reason
- Generic advice a competitor could receive verbatim
- The same "why worked" reason across two different posts — every post must have a UNIQUE explanation

=== SPECIFICITY BAR ===
Every "whyItWorked" or "whyItFailed" must name at least two of: hook design, cultural timing, product relevance, format-fit, celebrity or influencer resonance, audience behaviour, cost efficiency, competitive whitespace, storytelling register, execution quality.

=== OUTPUT ===
Return ONE JSON object, no markdown:
{
  "postAnalyses": [
    {
      "shortcode": "the exact shortcode from the input",
      "whyItWorked": "if the post performed well, one sentence naming 2+ specific creative reasons",
      "whyItFailed": "if the post underperformed, one sentence naming 2+ specific reasons; empty string if the post did well",
      "audienceBehaviourTriggered": "what the audience actually did (saved for later, shared publicly, tagged friends, scrolled past, etc.) with the metric that shows it",
      "supportingMetrics": "the specific numbers that support the read (e.g. 'ER 4.2%, Saves 189, above median 42')",
      "keyLearning": "the ONE thing to remember for future planning",
      "predictableFutureOpportunity": "a specific, named future post/theme this teaches",
      "recommendedNextIteration": "the concrete next version — brand, angle, format, execution",
      "confidenceScore": 0-100,
      "verdict": "ONE of: ${ALLOWED_VERDICTS.join(", ")}"
    }
  ],
  "continueStopStart": {
    "continueDoing": [{"point":"specific pattern working now","metric":"supporting number"}],
    "stopDoing": [{"point":"specific pattern failing now","metric":"supporting number"}],
    "startDoing": [{"point":"specific new pattern to try","metric":"data-anchored rationale"}]
  }
}
Rules:
- Include an entry for EVERY post in the input, using the exact shortcode from the input.
- 3-5 items per continueDoing/stopDoing/startDoing list.
- Every metric must be an actual number from the input.
- Output the JSON only, concise throughout, no filler.`;
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
    generationConfig: { temperature: 0.55, topP: 0.9, maxOutputTokens: 16384 },
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
  const postAnalyses: AiPostAnalysis[] = rawA.map((r) => ({
    shortcode: String(r.shortcode ?? ""),
    whyItWorked: String(r.whyItWorked ?? ""),
    whyItFailed: String(r.whyItFailed ?? ""),
    audienceBehaviourTriggered: String(r.audienceBehaviourTriggered ?? ""),
    supportingMetrics: String(r.supportingMetrics ?? ""),
    keyLearning: String(r.keyLearning ?? ""),
    predictableFutureOpportunity: String(r.predictableFutureOpportunity ?? ""),
    recommendedNextIteration: String(r.recommendedNextIteration ?? ""),
    confidenceScore: Number(r.confidenceScore ?? 50),
    verdict: (() => {
      const v = String(r.verdict ?? "");
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
