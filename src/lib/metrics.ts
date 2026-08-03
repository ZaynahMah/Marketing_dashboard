import { totalReach } from "./merge";
import { ratio, round, sumNullable } from "./normalize";
import type { ConsolidatedPost, ContentBucket, PostFormat } from "./schema";

export interface Totals {
  posts: number;
  spend: number;
  reach: number; // organic + paid
  organicReach: number;
  paidReach: number;
  views: number;
  saves: number;
  shares: number;
  comments: number;
  likes: number;
  follows: number;
  profileVisits: number;
  interactions: number;
  impressions: number;
  thruplays: number;
  paidEngagement: number;
  engagementRate: number | null; // interactions / reach %
}

const s = (vals: (number | null)[]) => sumNullable(vals) ?? 0;

export function computeTotals(posts: ConsolidatedPost[]): Totals {
  const reach = s(posts.map(totalReach));
  const interactions = s(posts.map((p) => p.interactions));
  return {
    posts: posts.length,
    spend: s(posts.map((p) => p.spend)),
    reach,
    organicReach: s(posts.map((p) => p.reach)),
    paidReach: s(posts.map((p) => p.paidReach)),
    views: s(posts.map((p) => p.views)),
    saves: s(posts.map((p) => p.saves)),
    shares: s(posts.map((p) => p.shares)),
    comments: s(posts.map((p) => p.comments)),
    likes: s(posts.map((p) => p.likes)),
    follows: s(posts.map((p) => p.follows)),
    profileVisits: s(posts.map((p) => p.profileVisits)),
    interactions,
    impressions: s(posts.map((p) => p.impressions)),
    thruplays: s(posts.map((p) => p.thruplays)),
    paidEngagement: s(posts.map((p) => p.paidEngagement)),
    engagementRate: round(ratio(interactions, reach) === null ? null : (interactions / reach) * 100, 2),
  };
}

export interface BucketStat {
  bucket: ContentBucket;
  posts: number;
  avgReach: number;
  avgEngagement: number;
  avgSaves: number;
  avgShares: number;
  avgViews: number;
  totalSpend: number;
  avgCpe: number | null;
  share: number; // % of posts
}

export function bucketStats(posts: ConsolidatedPost[]): BucketStat[] {
  const groups = new Map<ContentBucket, ConsolidatedPost[]>();
  for (const p of posts) {
    const arr = groups.get(p.contentBucket) ?? [];
    arr.push(p);
    groups.set(p.contentBucket, arr);
  }
  const out: BucketStat[] = [];
  for (const [bucket, arr] of groups) {
    const n = arr.length;
    const cpes = arr.map((p) => p.cpe).filter((v): v is number => v !== null);
    out.push({
      bucket,
      posts: n,
      avgReach: Math.round(s(arr.map(totalReach)) / n),
      avgEngagement: Math.round(s(arr.map((p) => p.interactions)) / n),
      avgSaves: Math.round(s(arr.map((p) => p.saves)) / n),
      avgShares: Math.round(s(arr.map((p) => p.shares)) / n),
      avgViews: Math.round(s(arr.map((p) => p.views)) / n),
      totalSpend: s(arr.map((p) => p.spend)),
      avgCpe: cpes.length ? round(cpes.reduce((a, b) => a + b, 0) / cpes.length, 2) : null,
      share: round((n / posts.length) * 100, 1) ?? 0,
    });
  }
  return out.sort((a, b) => b.avgSaves - a.avgSaves);
}

export interface FormatStat {
  format: PostFormat;
  posts: number;
  avgReach: number;
  avgViews: number;
  avgEngagement: number;
  avgShares: number;
  avgComments: number;
  avgSaves: number;
}

export function formatStats(posts: ConsolidatedPost[]): FormatStat[] {
  const groups = new Map<PostFormat, ConsolidatedPost[]>();
  for (const p of posts) {
    const arr = groups.get(p.format) ?? [];
    arr.push(p);
    groups.set(p.format, arr);
  }
  const out: FormatStat[] = [];
  for (const [format, arr] of groups) {
    const n = arr.length;
    out.push({
      format,
      posts: n,
      avgReach: Math.round(s(arr.map(totalReach)) / n),
      avgViews: Math.round(s(arr.map((p) => p.views)) / n),
      avgEngagement: Math.round(s(arr.map((p) => p.interactions)) / n),
      avgShares: Math.round(s(arr.map((p) => p.shares)) / n),
      avgComments: Math.round(s(arr.map((p) => p.comments)) / n),
      avgSaves: Math.round(s(arr.map((p) => p.saves)) / n),
    });
  }
  return out.sort((a, b) => b.avgReach - a.avgReach);
}

/** Post-level scores for ranking top/bottom performers. */
export interface ScoredPost {
  post: ConsolidatedPost;
  score: number; // 0-100 composite
  reachRank: number;
  erRank: number;
  saveRank: number;
  shareRank: number;
}

export function scorePosts(posts: ConsolidatedPost[]): ScoredPost[] {
  const rank = (vals: (number | null)[]) => {
    const max = Math.max(1, ...vals.map((v) => v ?? 0));
    return vals.map((v) => ((v ?? 0) / max) * 100);
  };
  const reachR = rank(posts.map(totalReach));
  const erR = rank(posts.map((p) => p.erByInteractions));
  const saveR = rank(posts.map((p) => p.saves));
  const shareR = rank(posts.map((p) => p.shares));
  const viewR = rank(posts.map((p) => p.views));

  return posts
    .map((post, i) => ({
      post,
      // Weighted toward the depth-of-engagement metrics the brief privileges.
      score: round(reachR[i] * 0.2 + erR[i] * 0.2 + saveR[i] * 0.3 + shareR[i] * 0.2 + viewR[i] * 0.1, 1) ?? 0,
      reachRank: round(reachR[i], 0) ?? 0,
      erRank: round(erR[i], 0) ?? 0,
      saveRank: round(saveR[i], 0) ?? 0,
      shareRank: round(shareR[i], 0) ?? 0,
    }))
    .sort((a, b) => b.score - a.score);
}

/** Period-over-period comparison helper. */
export interface Delta {
  current: number;
  previous: number | null;
  changePct: number | null;
}

export function delta(current: number, previous: number | null): Delta {
  const changePct =
    previous === null || previous === 0 ? null : round(((current - previous) / previous) * 100, 1);
  return { current, previous, changePct };
}

export function periodLabel(posts: ConsolidatedPost[]): string {
  const dates = posts
    .map((p) => p.publishTime)
    .filter((d): d is string => !!d)
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (!dates.length) return new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const a = fmt(dates[0]);
  const b = fmt(dates[dates.length - 1]);
  return a === b ? a : `${a} – ${b}`;
}
