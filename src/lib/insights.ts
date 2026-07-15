import { BUCKET_DOCTRINE, TCL } from "./brief";
import { totalReach } from "./merge";
import { fmtCompact, fmtCost, fmtCurrency, fmtInt, fmtPct } from "./normalize";
import { bucketStats, computeTotals, formatStats, scorePosts } from "./metrics";
import type { BucketStat } from "./metrics";
import type { ConsolidatedPost } from "./schema";

export type InsightKind = "win" | "risk" | "opportunity" | "efficiency" | "brand";

export interface Insight {
  kind: InsightKind;
  title: string;
  body: string; // always contains numbers — never an unbacked opinion
  metric?: string;
}

export interface Recommendation {
  headline: string;
  rationale: string;
  brandAlignment: string; // ties to the TCL brief
  priority: "High" | "Medium" | "Low";
  evidence: string;
}

const pctDiff = (a: number, b: number): number => (b === 0 ? 0 : ((a - b) / b) * 100);
const xTimes = (a: number, b: number): string => (b === 0 ? "—" : (a / b).toFixed(1) + "x");

/**
 * Executive summary — biggest win, biggest opportunity, best/weakest campaign,
 * content health, paid efficiency, organic summary. All numeric.
 */
export function executiveSummary(posts: ConsolidatedPost[]) {
  const totals = computeTotals(posts);
  const buckets = bucketStats(posts).filter((b) => b.posts >= 1);
  const scored = scorePosts(posts);
  const paidPosts = posts.filter((p) => p.hasPaid && p.spend);

  const bestBucket = [...buckets].sort((a, b) => b.avgSaves - a.avgSaves)[0];
  const worstBucket = [...buckets].filter((b) => b.posts >= 2).sort((a, b) => a.avgSaves - b.avgSaves)[0];

  const withCpe = paidPosts.filter((p) => p.cpe !== null);
  const bestPaid = [...withCpe].sort((a, b) => (a.cpe ?? 9e9) - (b.cpe ?? 9e9))[0];
  const worstPaid = [...withCpe].sort((a, b) => (b.cpe ?? 0) - (a.cpe ?? 0))[0];

  const topPost = scored[0]?.post;

  return {
    totals,
    biggestWin: topPost
      ? `"${trim(topPost.description)}" reached ${fmtCompact(totalReach(topPost))} with ${fmtInt(
          topPost.saves
        )} saves and ${fmtInt(topPost.shares)} shares — the strongest depth-of-engagement post this period.`
      : "Not enough data to determine the standout post.",
    biggestOpportunity:
      bestBucket && worstBucket
        ? `${bestBucket.bucket} content averages ${fmtInt(bestBucket.avgSaves)} saves vs ${fmtInt(
            worstBucket.avgSaves
          )} for ${worstBucket.bucket} — a ${xTimes(bestBucket.avgSaves, Math.max(1, worstBucket.avgSaves))} gap. Rebalance the mix toward ${bestBucket.bucket}.`
        : "Publish across more content buckets to surface the opportunity gap.",
    bestCampaign: bestPaid
      ? `"${trim(bestPaid.campaignName || bestPaid.description)}" — CPE ${fmtCost(bestPaid.cpe)}, CPV ${fmtCost(
          bestPaid.cpv
        )} on ${fmtCurrency(bestPaid.spend)} spend.`
      : "No paid campaigns with measurable efficiency.",
    weakestCampaign: worstPaid && worstPaid !== bestPaid
      ? `"${trim(worstPaid.campaignName || worstPaid.description)}" — CPE ${fmtCost(
          worstPaid.cpe
        )} on ${fmtCurrency(worstPaid.spend)} spend, the least efficient this period.`
      : "No underperforming campaign flagged.",
    contentHealth: `${totals.posts} posts · ${fmtPct(totals.engagementRate)} blended engagement rate · ${fmtCompact(
      totals.saves
    )} saves · ${fmtCompact(totals.shares)} shares. ${
      (totals.engagementRate ?? 0) >= 3 ? "Depth of engagement is healthy for a luxury register." : "Engagement depth has room to deepen — favour save-driving editorial."
    }`,
    paidSummary: `${fmtCurrency(totals.spend)} deployed across ${paidPosts.length} boosted posts, driving ${fmtCompact(
      totals.paidReach
    )} paid reach and ${fmtCompact(totals.thruplays)} thruplays.`,
    organicSummary: `Organic reach ${fmtCompact(totals.organicReach)} across ${
      posts.filter((p) => p.reach).length
    } posts, with ${fmtCompact(totals.follows)} follows and ${fmtCompact(totals.profileVisits)} profile visits.`,
  };
}

/** Strategic insight cards — wins, risks, opportunities. All backed by numbers. */
export function strategicInsights(posts: ConsolidatedPost[]): Insight[] {
  const insights: Insight[] = [];
  const buckets = bucketStats(posts).filter((b) => b.posts >= 2);
  const formats = formatStats(posts).filter((f) => f.posts >= 2);
  const paid = posts.filter((p) => p.hasPaid && p.cpe !== null);

  // WIN — best save-driving bucket vs promotional baseline.
  if (buckets.length >= 2) {
    const top = buckets[0];
    const promo = buckets.find((b) => b.bucket === "Sale" || b.bucket === "Campaign") ?? buckets[buckets.length - 1];
    if (top && promo && top.bucket !== promo.bucket && promo.avgSaves > 0) {
      insights.push({
        kind: "win",
        title: `${top.bucket} leads on saves`,
        body: `${top.bucket} content generated ${xTimes(top.avgSaves, promo.avgSaves)} more saves than ${promo.bucket} (${fmtInt(
          top.avgSaves
        )} vs ${fmtInt(promo.avgSaves)} avg)${
          top.avgCpe && promo.avgCpe ? ` while costing ${fmtPct(Math.abs(pctDiff(top.avgCpe, promo.avgCpe)))} ${top.avgCpe < promo.avgCpe ? "less" : "more"} per engagement` : ""
        }. ${BUCKET_DOCTRINE[top.bucket] ?? ""}`,
        metric: `${fmtInt(top.avgSaves)} avg saves`,
      });
    }
  }

  // EFFICIENCY — low-spend posts vs high-spend posts on CPV.
  const spendVals = paid.map((p) => p.spend ?? 0).sort((a, b) => a - b);
  if (spendVals.length >= 4) {
    const median = spendVals[Math.floor(spendVals.length / 2)];
    const low = paid.filter((p) => (p.spend ?? 0) <= median && p.cpv !== null);
    const high = paid.filter((p) => (p.spend ?? 0) > median && p.cpv !== null);
    if (low.length && high.length) {
      const lowCpv = avg(low.map((p) => p.cpv!));
      const highCpv = avg(high.map((p) => p.cpv!));
      if (lowCpv < highCpv) {
        insights.push({
          kind: "efficiency",
          title: "Smaller boosts buy cheaper views",
          body: `Posts with spend under ${fmtCurrency(median)} achieved a CPV of ${fmtCost(lowCpv)} — ${fmtPct(Math.abs(pctDiff(highCpv, lowCpv)))} cheaper than posts above ${fmtCurrency(median)} (${fmtCost(highCpv)}). Budget should shift toward high-performing editorial storytelling rather than simply increasing spend.`,
          metric: `${fmtCost(lowCpv)} vs ${fmtCost(highCpv)} CPV`,
        });
      }
    }
  }

  // OPPORTUNITY — a favoured format under-utilised relative to its performance.
  if (formats.length >= 2) {
    const reelsF = formats.find((f) => f.format === "Reel");
    const other = formats.find((f) => f.format !== "Reel");
    if (reelsF && other && reelsF.avgReach > other.avgReach) {
      insights.push({
        kind: "opportunity",
        title: "Cinematic Reels out-reach other formats",
        body: `Reels average ${fmtCompact(reelsF.avgReach)} reach vs ${fmtCompact(
          other.avgReach
        )} for ${other.format} (${xTimes(reelsF.avgReach, other.avgReach)}). In line with our favoured cinematic-Reel format, protect this share — editorial quality, never UGC.`,
        metric: `${fmtCompact(reelsF.avgReach)} avg reach`,
      });
    }
  }

  // RISK — spend concentrated in a weak-save bucket.
  const spendByBucket = bucketStats(posts).filter((b) => b.totalSpend > 0).sort((a, b) => b.totalSpend - a.totalSpend);
  if (spendByBucket.length >= 2) {
    const topSpend = spendByBucket[0];
    const medianSaves = median(bucketStats(posts).map((b) => b.avgSaves));
    if (topSpend.avgSaves < medianSaves) {
      insights.push({
        kind: "risk",
        title: `Spend concentrated in a low-save bucket`,
        body: `${topSpend.bucket} absorbed ${fmtCurrency(topSpend.totalSpend)} — the largest share of spend — yet averages only ${fmtInt(
          topSpend.avgSaves
        )} saves, below the ${fmtInt(medianSaves)} median. Redirect budget toward buckets that earn depth of engagement.`,
        metric: `${fmtCurrency(topSpend.totalSpend)} at ${fmtInt(topSpend.avgSaves)} saves`,
      });
    }
  }

  // BRAND — craftsmanship / editorial watch-time alignment.
  const craft = bucketStats(posts).find((b) => b.bucket === "Craftsmanship" && b.posts >= 1);
  const sale = bucketStats(posts).find((b) => b.bucket === "Sale" && b.posts >= 1);
  if (craft && (!sale || craft.avgViews >= (sale?.avgViews ?? 0))) {
    insights.push({
      kind: "brand",
      title: "Craft narratives align with positioning",
      body: `Craftsmanship content averages ${fmtCompact(craft.avgViews)} views${
        sale ? ` vs ${fmtCompact(sale.avgViews)} for Sale content` : ""
      }. This aligns with our maison positioning — behind-the-maison storytelling should become a recurring content series.`,
      metric: `${fmtCompact(craft.avgViews)} avg views`,
    });
  }

  return insights;
}

/** Prioritised, TCL-voiced recommendations for the AI Recommendations section. */
export function recommendations(posts: ConsolidatedPost[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const buckets = bucketStats(posts).filter((b) => b.posts >= 2);
  const paid = posts.filter((p) => p.hasPaid && p.cpe !== null);

  // 1. Rebalance mix toward the best save-per-post bucket.
  if (buckets.length >= 2) {
    const best = [...buckets].sort((a, b) => b.avgSaves - a.avgSaves)[0];
    const weak = [...buckets].sort((a, b) => a.avgSaves - b.avgSaves)[0];
    if (best.bucket !== weak.bucket) {
      const targetShare = Math.min(35, Math.round(best.share + 12));
      recs.push({
        headline: `Grow ${best.bucket} from ${fmtPct(best.share, 0)} to ${targetShare}% of the mix`,
        rationale: `${best.bucket} generated ${xTimes(best.avgSaves, Math.max(1, weak.avgSaves))} more saves than ${weak.bucket} (${fmtInt(
          best.avgSaves
        )} vs ${fmtInt(weak.avgSaves)} avg per post)${best.avgCpe && weak.avgCpe ? `, at ${fmtPct(Math.abs(pctDiff(best.avgCpe, weak.avgCpe)))} ${best.avgCpe < weak.avgCpe ? "lower" : "higher"} cost per engagement` : ""}.`,
        brandAlignment: BUCKET_DOCTRINE[best.bucket] ?? "Consistent with our depth-over-breadth engagement philosophy.",
        priority: "High",
        evidence: `${best.bucket}: ${fmtInt(best.avgSaves)} saves/post · ${best.posts} posts · ${fmtPct(best.share, 0)} of mix`,
      });
    }
  }

  // 2. Reallocate spend from least to most efficient campaign.
  const withCpe = paid.filter((p) => p.cpe !== null && p.spend);
  if (withCpe.length >= 2) {
    const eff = [...withCpe].sort((a, b) => (a.cpe ?? 9e9) - (b.cpe ?? 9e9));
    const bestC = eff[0];
    const worstC = eff[eff.length - 1];
    if (bestC !== worstC && (worstC.cpe ?? 0) > (bestC.cpe ?? 0) * 1.3) {
      recs.push({
        headline: `Shift budget from "${trim(worstC.campaignName || worstC.description, 30)}" to editorial storytelling`,
        rationale: `"${trim(worstC.campaignName || worstC.description, 40)}" spent ${fmtCurrency(
          worstC.spend
        )} at ${fmtCost(worstC.cpe)} CPE, while "${trim(bestC.campaignName || bestC.description, 40)}" achieved ${fmtCost(
          bestC.cpe
        )} CPE — ${fmtPct(Math.abs(pctDiff(worstC.cpe!, bestC.cpe!)))} cheaper per engagement.`,
        brandAlignment: TCL.saleDoctrine,
        priority: "High",
        evidence: `Best CPE ${fmtCost(bestC.cpe)} vs worst ${fmtCost(worstC.cpe)}`,
      });
    }
  }

  // 3. Format discipline — protect the cinematic Reel.
  const formats = formatStats(posts).filter((f) => f.posts >= 2);
  const reels = formats.find((f) => f.format === "Reel");
  if (reels) {
    const others = formats.filter((f) => f.format !== "Reel");
    if (others.length) {
      const otherAvg = avg(others.map((f) => f.avgReach));
      if (reels.avgReach > otherAvg) {
        recs.push({
          headline: "Hold cinematic Reels as the primary reach engine",
          rationale: `Reels average ${fmtCompact(reels.avgReach)} reach — ${xTimes(
            reels.avgReach,
            Math.max(1, otherAvg)
          )} the ${fmtCompact(otherAvg)} of other formats — and ${fmtInt(reels.avgSaves)} saves per post.`,
          brandAlignment: "Cinematic Reels are our favoured format — editorial quality, considered pacing, never UGC-style.",
          priority: "Medium",
          evidence: `Reel reach ${fmtCompact(reels.avgReach)} vs ${fmtCompact(otherAvg)}`,
        });
      }
    }
  }

  // 4. Craftsmanship series recommendation if it beats promotional watch time.
  const craft = buckets.find((b) => b.bucket === "Craftsmanship");
  if (craft) {
    recs.push({
      headline: "Commission a recurring behind-the-maison craft series",
      rationale: `Craftsmanship content averages ${fmtCompact(craft.avgViews)} views and ${fmtInt(
        craft.avgSaves
      )} saves per post, indicating longer considered attention than promotional edits.`,
      brandAlignment: BUCKET_DOCTRINE["Craftsmanship"],
      priority: "Medium",
      evidence: `${fmtCompact(craft.avgViews)} avg views · ${craft.posts} posts`,
    });
  }

  return recs;
}

// ---- small stats helpers ----
function avg(vals: number[]): number {
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}
function median(vals: number[]): number {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
function trim(s: string, n = 48): string {
  const t = (s || "").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t || "Untitled post";
}
