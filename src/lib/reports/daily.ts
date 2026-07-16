/**
 * Daily consolidated report — the expanded per-post schema requested for the
 * daily deliverable, plus a per-post qualitative read that is derived from that
 * post's ACTUAL metrics (never generic). Columns the Instagram export cannot
 * supply (Reposts, per-post liker demographics) are surfaced honestly as "—"
 * rather than invented.
 */
import { totalReach } from "@/lib/merge";
import { fmtCost, fmtInt, fmtPct } from "@/lib/normalize";
import type { ConsolidatedPost } from "@/lib/schema";

export const DAILY_COLUMNS = [
  "SR. NO",
  "Date",
  "Post Description",
  "Post Link",
  "Boosting Amount",
  "Boosting Split",
  "Post Format",
  "Likes",
  "Saves",
  "Shares",
  "Comments",
  "Reposts",
  "Interactions / Engagement",
  "Reach",
  "Views",
  "Profile Activity",
  "Follows",
  "ER% Basis Reach",
  "CPV",
  "CPR",
  "CPE",
  "CTR",
  "Avg Watch Time (Reels)",
  "Skip Rate (Reels)",
  "Per Post Qualitative Analysis",
  "Analysis of People Who Liked the Post",
] as const;

function dateStr(p: ConsolidatedPost): string {
  const raw = p.publishTime || p.startDate;
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}

/** Avg watch time proxy (Reels): VTR% × clip duration, in seconds. */
export function avgWatchSeconds(p: ConsolidatedPost): number | null {
  if (p.format !== "Reel") return null;
  if (p.vtr == null || p.durationSec == null) return null;
  return (p.vtr / 100) * p.durationSec;
}

export function skipRate(p: ConsolidatedPost): number | null {
  if (p.format !== "Reel" || p.vtr == null) return null;
  return Math.max(0, 100 - p.vtr);
}

/**
 * Per-post qualitative analysis, grounded strictly in this post's numbers and
 * relative to the day's medians. Reads like a strategist's margin note.
 */
export function qualitative(p: ConsolidatedPost, ctx: { medianReach: number; medianSaves: number; medianEr: number }): string {
  const reach = totalReach(p) ?? 0;
  const saves = p.saves ?? 0;
  const shares = p.shares ?? 0;
  const er = p.erByInteractions ?? 0;
  const notes: string[] = [];

  if (reach >= ctx.medianReach * 1.5) notes.push(`Reach ${fmtInt(reach)} sits well above the day's median — strong distribution`);
  else if (reach > 0 && reach < ctx.medianReach * 0.5) notes.push(`Reach ${fmtInt(reach)} is under half the median — weak hook or limited push`);

  if (saves >= Math.max(1, ctx.medianSaves) * 1.5) notes.push(`${fmtInt(saves)} saves signal high keep-intent — this is reference-grade content`);
  if (shares >= 1 && shares >= saves) notes.push(`shares (${fmtInt(shares)}) outpace saves — it travelled socially`);
  if (shares === 0 && saves === 0) notes.push("no saves or shares — it informed but did not earn depth");

  if (er >= Math.max(ctx.medianEr, 1)) notes.push(`${fmtPct(er, 2)} engagement rate (basis reach) is above par`);
  else if (er > 0 && er < ctx.medianEr * 0.6) notes.push(`${fmtPct(er, 2)} engagement rate lags the day — soft CTA or off-register creative`);

  if (p.format === "Reel") {
    const skip = skipRate(p);
    if (skip != null && skip >= 70) notes.push(`skip rate ~${fmtPct(skip)} — the first seconds aren't holding viewers`);
    else if (skip != null && skip <= 40) notes.push(`skip rate ~${fmtPct(skip)} — the hook is retaining well`);
  }

  if ((p.spend ?? 0) > 0) {
    if (p.cpe != null) notes.push(`paid: ${fmtCost(p.cpe)} per engagement`);
    if (p.cpr != null) notes.push(`${fmtCost(p.cpr)} per reach`);
  }

  if (!notes.length) return "Middling across every axis for the day — did not distinguish itself.";
  // Capitalise the first note; join naturally.
  const joined = notes.join("; ");
  return joined.charAt(0).toUpperCase() + joined.slice(1) + ".";
}

export function buildDailyAoA(posts: ConsolidatedPost[]): (string | number)[][] {
  const reaches = posts.map((p) => totalReach(p) ?? 0).sort((a, b) => a - b);
  const saves = posts.map((p) => p.saves ?? 0).sort((a, b) => a - b);
  const ers = posts.map((p) => p.erByInteractions ?? 0).filter((x) => x > 0).sort((a, b) => a - b);
  const med = (a: number[]) => (a.length ? a[Math.floor(a.length / 2)] : 0);
  const ctx = { medianReach: med(reaches), medianSaves: med(saves), medianEr: med(ers) };

  const rows: (string | number)[][] = [DAILY_COLUMNS as unknown as string[]];
  posts.forEach((p, i) => {
    const watch = avgWatchSeconds(p);
    const skip = skipRate(p);
    rows.push([
      i + 1,
      dateStr(p),
      p.description || p.shortcode,
      p.postLink,
      p.spend ?? "",
      p.campaignObjective || (p.hasPaid ? "Boosted" : "—"),
      p.format,
      p.likes ?? "",
      p.saves ?? "",
      p.shares ?? "",
      p.comments ?? "",
      "—", // Reposts — not in IG export
      p.interactions ?? "",
      totalReach(p) ?? "",
      p.views ?? "",
      p.profileVisits ?? "",
      p.follows ?? "",
      p.erByInteractions != null ? Number(p.erByInteractions.toFixed(2)) : "",
      p.cpv != null ? Number(p.cpv.toFixed(3)) : "",
      p.cpr != null ? Number(p.cpr.toFixed(3)) : "",
      p.cpe != null ? Number(p.cpe.toFixed(3)) : "",
      p.ctr != null ? Number(p.ctr.toFixed(2)) : "",
      watch != null ? `${watch.toFixed(1)}s` : "—",
      skip != null ? `${skip.toFixed(0)}%` : "—",
      qualitative(p, ctx),
      "—", // Liker demographics require an audience-level export
    ]);
  });
  return rows;
}
