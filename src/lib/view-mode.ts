/**
 * Total / Paid / Organic decomposition per the TCL workflow:
 *   Post publishes → runs organically for 24h → gets boosted via Meta Ads Manager.
 *
 * The Meta Business Suite export = ORGANIC delivery only (Instagram's organic
 * surfacing; it does NOT include paid reach). The Ads Manager export = PAID
 * delivery only. The two are additive, not overlapping.
 *
 * Therefore:
 *   ORGANIC = the Business Suite numbers as reported.
 *   PAID    = the boosted numbers from Meta Ads Manager.
 *   TOTAL   = ORGANIC + PAID.
 *
 * Where a metric only exists on one side (impressions on paid; likes on
 * organic), the other side is 0 for the addition. We floor at 0 and flag
 * posts where any organic metric is missing but paid ran, so users see the
 * gap rather than a silent zero.
 */
import type { ConsolidatedPost } from "./schema";

export type ViewMode = "total" | "paid" | "organic";

/** A view-flattened post: same shape whether we're looking at total/paid/organic. */
export interface ViewPost {
  shortcode: string;
  postLink: string;
  description: string;
  format: ConsolidatedPost["format"];
  contentBucket: ConsolidatedPost["contentBucket"];
  publishTime: string | null;
  campaignName: string | null;
  objective: string;
  reach: number | null;
  views: number | null;
  impressions: number | null;
  likes: number | null;
  saves: number | null;
  shares: number | null;
  comments: number | null;
  follows: number | null;
  profileVisits: number | null;
  interactions: number | null;
  spend: number | null;
  er: number | null; // engagement rate basis reach
  cpr: number | null;
  cpv: number | null;
  cpe: number | null;
  ctr: number | null;
  vtr: number | null;
  durationSec: number | null;
  hasPaid: boolean;
  /** Ran paid but no organic delivery reported — visible gap in Business Suite. */
  anomaly: boolean;
}

function nz(n: number | null | undefined): number {
  return n ?? 0;
}
function add(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  return nz(a) + nz(b);
}
function ratio(num: number | null, den: number | null): number | null {
  const d = nz(den);
  if (!d) return null;
  return (nz(num) / d) * 100;
}

/** Organic view — Business Suite as reported. */
function toOrganic(p: ConsolidatedPost): ViewPost {
  const reach = p.reach;
  const interactions = p.interactions;
  return {
    shortcode: p.shortcode,
    postLink: p.postLink,
    description: p.description,
    format: p.format,
    contentBucket: p.contentBucket,
    publishTime: p.publishTime,
    campaignName: p.campaignName,
    objective: p.objective,
    reach,
    views: p.views,
    impressions: null, // impressions come from Ads Manager only
    likes: p.likes,
    saves: p.saves,
    shares: p.shares,
    comments: p.comments,
    follows: p.follows,
    profileVisits: p.profileVisits,
    interactions,
    spend: null, // organic has no spend by definition
    er: ratio(interactions, reach),
    cpr: null,
    cpv: null,
    cpe: null,
    ctr: null,
    vtr: null,
    durationSec: p.durationSec,
    hasPaid: false,
    anomaly: false,
  };
}

/** Paid view — Ads Manager only. */
function toPaid(p: ConsolidatedPost): ViewPost {
  const reach = p.paidReach;
  const interactions = p.paidEngagement;
  return {
    shortcode: p.shortcode,
    postLink: p.postLink,
    description: p.description,
    format: p.format,
    contentBucket: p.contentBucket,
    publishTime: p.publishTime,
    campaignName: p.campaignName,
    objective: p.objective,
    reach,
    views: p.thruplays,
    impressions: p.impressions,
    likes: null, // Ads Manager reports engagement aggregate, not likes split
    saves: p.paidSaves,
    shares: p.paidShares,
    comments: p.paidComments,
    follows: null,
    profileVisits: p.profileVisits,
    interactions,
    spend: p.spend,
    er: ratio(interactions, reach),
    cpr: p.cpr,
    cpv: p.cpv,
    cpe: p.cpe,
    ctr: p.ctr,
    vtr: p.vtr,
    durationSec: p.durationSec,
    hasPaid: p.hasPaid,
    anomaly: false,
  };
}

/** Total view — additive: organic + paid, per metric. */
function toTotal(p: ConsolidatedPost): ViewPost {
  const reach = add(p.reach, p.paidReach);
  const views = add(p.views, p.thruplays);
  const saves = add(p.saves, p.paidSaves);
  const shares = add(p.shares, p.paidShares);
  const comments = add(p.comments, p.paidComments);
  const interactions = add(p.interactions, p.paidEngagement);
  const anomaly = p.hasPaid && !p.reach && !p.views; // ran paid, no organic data

  return {
    shortcode: p.shortcode,
    postLink: p.postLink,
    description: p.description,
    format: p.format,
    contentBucket: p.contentBucket,
    publishTime: p.publishTime,
    campaignName: p.campaignName,
    objective: p.objective,
    reach,
    views,
    impressions: p.impressions,
    likes: p.likes, // paid side does not split likes → all likes are organic-reported
    saves,
    shares,
    comments,
    follows: p.follows,
    profileVisits: p.profileVisits,
    interactions,
    spend: p.spend,
    er: ratio(interactions, reach),
    cpr: reach ? nz(p.spend) / reach : null,
    cpv: views ? nz(p.spend) / views : null,
    cpe: interactions ? nz(p.spend) / interactions : null,
    ctr: p.ctr,
    vtr: p.vtr,
    durationSec: p.durationSec,
    hasPaid: p.hasPaid,
    anomaly,
  };
}

export function toViewPost(p: ConsolidatedPost, mode: ViewMode): ViewPost {
  switch (mode) {
    case "paid":
      return toPaid(p);
    case "organic":
      return toOrganic(p);
    case "total":
    default:
      return toTotal(p);
  }
}

export function toViewPosts(posts: ConsolidatedPost[], mode: ViewMode): ViewPost[] {
  const out = posts.map((p) => toViewPost(p, mode));
  if (mode === "paid") return out.filter((p) => p.hasPaid && (p.spend ?? 0) > 0);
  return out;
}

/** Count posts flagged as anomalous (ran paid but no organic delivery reported). */
export function countAnomalies(posts: ConsolidatedPost[]): number {
  return posts.filter((p) => p.hasPaid && !p.reach && !p.views).length;
}
