/**
 * View-mode aware totals + rollups. Consumes ViewPost[] (already flattened for
 * total/paid/organic) so the same aggregations serve all three modes with
 * identical logic.
 */
import { CONTENT_BUCKETS } from "./schema";
import type { ContentBucket, PostFormat } from "./schema";
import type { ViewPost } from "./view-mode";

function s(vals: (number | null)[]): number {
  return vals.reduce<number>((a, b) => a + (b ?? 0), 0);
}
function ratio(num: number, den: number): number | null {
  if (!den) return null;
  return (num / den) * 100;
}

export interface ViewTotals {
  posts: number;
  reach: number;
  views: number;
  impressions: number;
  likes: number;
  saves: number;
  shares: number;
  comments: number;
  interactions: number;
  follows: number;
  profileVisits: number;
  spend: number;
  spendLakhs: number; // spend / 100_000
  er: number | null; // basis reach
  cpr: number | null;
  cpv: number | null;
  cpe: number | null;
  ctr: number | null;
  // Reels-only aggregates
  avgWatchSeconds: number | null;
  skipRate: number | null;
}

export function viewTotals(posts: ViewPost[]): ViewTotals {
  const reach = s(posts.map((p) => p.reach));
  const views = s(posts.map((p) => p.views));
  const interactions = s(posts.map((p) => p.interactions));
  const impressions = s(posts.map((p) => p.impressions));
  const spend = s(posts.map((p) => p.spend));

  // Reels-only weighted averages for watch/skip
  const reels = posts.filter((p) => p.format === "Reel" && p.vtr != null);
  const totalWatchSec = reels.reduce((a, p) => {
    if (p.vtr == null || p.durationSec == null || p.views == null) return a;
    return a + (p.vtr / 100) * p.durationSec * p.views;
  }, 0);
  const reelViewsForWatch = reels.reduce((a, p) => a + (p.views ?? 0), 0);
  const avgWatchSeconds = reelViewsForWatch ? totalWatchSec / reelViewsForWatch : null;
  const vtrs = reels.map((p) => p.vtr!).filter((v) => v > 0);
  const meanVtr = vtrs.length ? vtrs.reduce((a, b) => a + b, 0) / vtrs.length : null;
  const skipRate = meanVtr == null ? null : Math.max(0, 100 - meanVtr);

  return {
    posts: posts.length,
    reach,
    views,
    impressions,
    likes: s(posts.map((p) => p.likes)),
    saves: s(posts.map((p) => p.saves)),
    shares: s(posts.map((p) => p.shares)),
    comments: s(posts.map((p) => p.comments)),
    interactions,
    follows: s(posts.map((p) => p.follows)),
    profileVisits: s(posts.map((p) => p.profileVisits)),
    spend,
    spendLakhs: spend / 100000,
    er: ratio(interactions, reach),
    cpr: reach ? spend / reach : null,
    cpv: views ? spend / views : null,
    cpe: interactions ? spend / interactions : null,
    ctr: impressions ? ratio(s(posts.map((p) => p.profileVisits)), impressions) : null,
    avgWatchSeconds,
    skipRate,
  };
}

export interface ViewBucketStat {
  bucket: ContentBucket;
  posts: number;
  reach: number;
  views: number;
  likes: number;
  saves: number;
  shares: number;
  interactions: number;
  spend: number;
  avgReach: number;
  avgViews: number;
  avgSaves: number;
  avgShares: number;
  avgLikes: number;
  avgEngagement: number;
  er: number | null;
  cpe: number | null;
  performance: "High" | "Medium" | "Low" | "Missing";
}

/** Includes every one of the nine buckets — "Missing" if we have no posts. */
export function viewBucketStats(posts: ViewPost[]): ViewBucketStat[] {
  const groups = new Map<ContentBucket, ViewPost[]>();
  for (const p of posts) {
    const b = (p.contentBucket ?? "Uncategorised") as ContentBucket;
    (groups.get(b) ?? groups.set(b, []).get(b)!).push(p);
  }
  const rows: ViewBucketStat[] = CONTENT_BUCKETS.map((bucket) => {
    const g = groups.get(bucket) ?? [];
    const reach = s(g.map((p) => p.reach));
    const views = s(g.map((p) => p.views));
    const interactions = s(g.map((p) => p.interactions));
    const spend = s(g.map((p) => p.spend));
    return {
      bucket,
      posts: g.length,
      reach,
      views,
      likes: s(g.map((p) => p.likes)),
      saves: s(g.map((p) => p.saves)),
      shares: s(g.map((p) => p.shares)),
      interactions,
      spend,
      avgReach: g.length ? reach / g.length : 0,
      avgViews: g.length ? views / g.length : 0,
      avgSaves: g.length ? s(g.map((p) => p.saves)) / g.length : 0,
      avgShares: g.length ? s(g.map((p) => p.shares)) / g.length : 0,
      avgLikes: g.length ? s(g.map((p) => p.likes)) / g.length : 0,
      avgEngagement: g.length ? interactions / g.length : 0,
      er: ratio(interactions, reach),
      cpe: interactions ? spend / interactions : null,
      performance: "Medium",
    };
  });

  // Score buckets by (normalised avgSaves + avgShares + er) and label High/Med/Low.
  const withPosts = rows.filter((r) => r.posts >= 1);
  if (withPosts.length === 0) return rows.map((r) => ({ ...r, performance: "Missing" }));
  const maxSaves = Math.max(1, ...withPosts.map((r) => r.avgSaves));
  const maxShares = Math.max(1, ...withPosts.map((r) => r.avgShares));
  const maxEr = Math.max(0.01, ...withPosts.map((r) => r.er ?? 0));
  const scored = rows.map((r) => {
    if (r.posts === 0) return { r, score: -1 };
    const score = r.avgSaves / maxSaves + r.avgShares / maxShares + (r.er ?? 0) / maxEr;
    return { r, score };
  });
  const active = scored.filter((x) => x.score >= 0).sort((a, b) => b.score - a.score);
  const nHigh = Math.max(1, Math.ceil(active.length / 3));
  const nLow = Math.max(1, Math.ceil(active.length / 3));
  active.forEach((x, i) => {
    if (i < nHigh) x.r.performance = "High";
    else if (i >= active.length - nLow) x.r.performance = "Low";
    else x.r.performance = "Medium";
  });
  scored.filter((x) => x.score < 0).forEach((x) => (x.r.performance = "Missing"));
  return rows;
}

export interface ViewFormatStat {
  format: PostFormat;
  posts: number;
  avgReach: number;
  avgViews: number;
  avgSaves: number;
  er: number | null;
  avgWatchSeconds: number | null;
  skipRate: number | null;
}

export function viewFormatStats(posts: ViewPost[]): ViewFormatStat[] {
  const formats: PostFormat[] = ["Reel", "Carousel", "Static", "Story", "Video"];
  return formats.map((format) => {
    const g = posts.filter((p) => p.format === format);
    const reach = s(g.map((p) => p.reach));
    const interactions = s(g.map((p) => p.interactions));
    const reels = g.filter((p) => p.vtr != null);
    const totalWatch = reels.reduce((a, p) => a + ((p.vtr ?? 0) / 100) * (p.durationSec ?? 0) * (p.views ?? 0), 0);
    const reelViews = reels.reduce((a, p) => a + (p.views ?? 0), 0);
    const meanVtr = reels.length ? reels.reduce((a, p) => a + (p.vtr ?? 0), 0) / reels.length : null;
    return {
      format,
      posts: g.length,
      avgReach: g.length ? reach / g.length : 0,
      avgViews: g.length ? s(g.map((p) => p.views)) / g.length : 0,
      avgSaves: g.length ? s(g.map((p) => p.saves)) / g.length : 0,
      er: ratio(interactions, reach),
      avgWatchSeconds: reelViews ? totalWatch / reelViews : null,
      skipRate: meanVtr == null ? null : Math.max(0, 100 - meanVtr),
    };
  }).filter((r) => r.posts > 0);
}

/** Multi-criteria ranking helpers. */
export type RankBy = "cpr" | "er" | "views" | "reach" | "follows";

export function rankPosts(posts: ViewPost[], by: RankBy, limit = 5): ViewPost[] {
  const arr = posts.slice();
  switch (by) {
    case "cpr":
      return arr.filter((p) => p.cpr != null && p.cpr > 0).sort((a, b) => (a.cpr! - b.cpr!)).slice(0, limit);
    case "er":
      return arr.filter((p) => p.er != null).sort((a, b) => (b.er! - a.er!)).slice(0, limit);
    case "views":
      return arr.sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, limit);
    case "reach":
      return arr.sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0)).slice(0, limit);
    case "follows":
      return arr.sort((a, b) => (b.follows ?? 0) - (a.follows ?? 0)).slice(0, limit);
  }
}
