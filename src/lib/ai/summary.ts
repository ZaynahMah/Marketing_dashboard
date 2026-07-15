/**
 * Builds the compact, numbers-only summary that gets sent to Gemini.
 *
 * Everything here is derived from the deterministic engine. No raw posts, no CSV,
 * no personal data leave the browser — only aggregate metrics and a small ranked
 * subset of post descriptions. This keeps the request tiny (token-cheap) and keeps
 * the deterministic engine as the single source of truth.
 */
import { totalReach } from "@/lib/merge";
import { bucketStats, computeTotals, delta, formatStats, periodLabel, scorePosts } from "@/lib/metrics";
import { strategicInsights } from "@/lib/insights";
import type { ConsolidatedPost } from "@/lib/schema";
import type { AiPostBrief, AiSummary } from "./types";

function brief(p: ConsolidatedPost): AiPostBrief {
  return {
    description: (p.description || p.shortcode).slice(0, 90),
    format: p.format,
    bucket: p.contentBucket,
    reach: Math.round(totalReach(p) ?? 0),
    saves: p.saves ?? 0,
    shares: p.shares ?? 0,
    comments: p.comments ?? 0,
    engagementRate: p.erByInteractions,
    spend: p.spend,
  };
}

export function buildAiSummary(posts: ConsolidatedPost[], prev?: ConsolidatedPost[]): AiSummary {
  const t = computeTotals(posts);
  const scored = scorePosts(posts);
  const buckets = bucketStats(posts).filter((b) => b.posts >= 1);
  const formats = formatStats(posts).filter((f) => f.format !== "Unknown");

  const totals: Record<string, number | null> = {
    posts: t.posts,
    spend: Math.round(t.spend),
    reach: Math.round(t.reach),
    organicReach: Math.round(t.organicReach),
    paidReach: Math.round(t.paidReach),
    views: Math.round(t.views),
    saves: t.saves,
    shares: t.shares,
    comments: t.comments,
    follows: t.follows,
    profileVisits: t.profileVisits,
    interactions: t.interactions,
    thruplays: t.thruplays,
    engagementRatePct: t.engagementRate,
  };

  let deltas: Record<string, number | null> | undefined;
  let comparedTo: string | null = null;
  if (prev && prev.length) {
    const pt = computeTotals(prev);
    comparedTo = periodLabel(prev);
    deltas = {
      reach: delta(t.reach, pt.reach).changePct,
      views: delta(t.views, pt.views).changePct,
      saves: delta(t.saves, pt.saves).changePct,
      shares: delta(t.shares, pt.shares).changePct,
      interactions: delta(t.interactions, pt.interactions).changePct,
      follows: delta(t.follows, pt.follows).changePct,
      spend: delta(t.spend, pt.spend).changePct,
    };
  }

  return {
    period: periodLabel(posts),
    comparedTo,
    totals,
    deltas,
    buckets: buckets.map((b) => ({
      bucket: b.bucket,
      posts: b.posts,
      avgReach: Math.round(b.avgReach),
      avgSaves: Math.round(b.avgSaves),
      avgShares: Math.round(b.avgShares),
      avgCpe: b.avgCpe,
      totalSpend: Math.round(b.totalSpend),
    })),
    formats: formats.map((f) => ({
      format: f.format,
      posts: f.posts,
      avgReach: Math.round(f.avgReach),
      avgEngagement: Math.round(f.avgEngagement),
      avgSaves: Math.round(f.avgSaves),
    })),
    topPerformers: scored.slice(0, 8).map((s) => brief(s.post)),
    lowPerformers: scored.slice(-6).reverse().map((s) => brief(s.post)),
    strategicInsights: strategicInsights(posts).map((i) => ({ kind: i.kind, title: i.title, body: i.body })),
    paid: {
      totalSpend: Math.round(t.spend),
      cpr: t.paidReach ? t.spend / t.paidReach : null,
      cpv: t.thruplays ? t.spend / t.thruplays : null,
      cpe: t.paidEngagement ? t.spend / t.paidEngagement : null,
      ctr: t.impressions ? (t.profileVisits / t.impressions) * 100 : null,
    },
  };
}
