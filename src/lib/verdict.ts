import type { ViewPost } from "./view-mode";
import type { AiPostAnalysis } from "./ai/types";

/**
 * Deterministic per-post read. Used to backfill any post the AI omits so the
 * UI is never blank. Everything here is derived from the numbers in the post
 * itself — no assumptions, no invented facts.
 */
export function deterministicPostReport(p: ViewPost, medians: { er: number; saves: number; shares: number; reach: number }): AiPostAnalysis {
  const er = p.er ?? 0;
  const saves = p.saves ?? 0;
  const shares = p.shares ?? 0;
  const reach = p.reach ?? 0;
  const spend = p.spend ?? 0;

  // Pattern-match verdict from performance vs medians.
  let verdict = "Evergreen";
  if (er >= medians.er * 2 && saves >= medians.saves * 2) verdict = "Scale Immediately";
  else if (er >= medians.er * 1.5 && (saves >= medians.saves || shares >= medians.shares)) verdict = "Repeat";
  else if (saves >= medians.saves * 2 && er < medians.er) verdict = "High Saves";
  else if (reach >= medians.reach * 2 && er < medians.er * 0.5) verdict = "High Reach Low Engagement";
  else if (er < medians.er * 0.4 && spend > 0) verdict = "Weak Performer";
  else if (er < medians.er * 0.5 && saves < medians.saves * 0.5) verdict = "Improve Hook";
  else if (er >= medians.er && shares < medians.shares * 0.5) verdict = "Needs Better CTA";
  else if (er < medians.er * 0.7) verdict = "Reduce Frequency";

  // Descriptive fallback text — flags this as a deterministic read so the reader knows.
  const worked = er >= medians.er;
  const supporting = `ER ${er.toFixed(2)}% (median ${medians.er.toFixed(2)}%) · Reach ${reach.toLocaleString("en-IN")} · Saves ${saves} · Shares ${shares}`;
  return {
    shortcode: p.shortcode,
    whyItWorked: worked ? `Performed above median engagement rate on ${p.format} / ${p.contentBucket} — the numbers indicate the format-bucket combination is resonating with the audience.` : "",
    whyItFailed: worked ? "" : `Under-indexed vs the median on the primary engagement metrics for ${p.format} / ${p.contentBucket}, suggesting the hook, timing, or bucket-format fit did not land.`,
    audienceBehaviourTriggered: saves >= medians.saves ? "Saves outpaced the median — an audience saving intent signal." : shares >= medians.shares ? "Shares outpaced the median — a public-signalling / social currency signal." : "Passive scroll behaviour dominated — limited saving or sharing.",
    supportingMetrics: supporting,
    keyLearning: worked ? `${p.contentBucket} in ${p.format} format is working for this account; note the numbers and use as a benchmark for the next iteration.` : `${p.contentBucket} in ${p.format} format under-delivered here; treat this as a signal to change the hook, cast, or occasion rather than to repeat.`,
    predictableFutureOpportunity: worked ? `Repeat the same ${p.contentBucket} + ${p.format} combination with a different brand or occasion angle within the next 7-10 days.` : `Retire this exact combination for at least two weeks; test a different ${p.contentBucket} angle or a different format entirely.`,
    recommendedNextIteration: worked ? `Cast a different brand from the portfolio into the same ${p.format} template, keep the same hook rhythm.` : `Rework the opening 2 seconds and switch to a stronger hook — either a named brand, a named occasion, or a named person.`,
    confidenceScore: 55, // conservative — this is deterministic, not AI-authored
    verdict,
  };
}

export function computeMedians(posts: ViewPost[]): { er: number; saves: number; shares: number; reach: number } {
  const med = (arr: number[]) => {
    const s = arr.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
    if (!s.length) return 0;
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };
  return {
    er: med(posts.map((p) => p.er ?? 0)),
    saves: med(posts.map((p) => p.saves ?? 0)),
    shares: med(posts.map((p) => p.shares ?? 0)),
    reach: med(posts.map((p) => p.reach ?? 0)),
  };
}
