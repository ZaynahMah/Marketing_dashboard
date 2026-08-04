/**
 * Excel builders for the three report levels. All quantitative sheets are built
 * from the deterministic engine. An optional AI narrative (already generated
 * elsewhere) can be appended as a "Strategy" sheet — the numbers never come from AI.
 */
import * as XLSX from "xlsx";
import { totalReach } from "@/lib/merge";
import { bucketStats, computeTotals, formatStats, scorePosts } from "@/lib/metrics";
import type { ConsolidatedPost } from "@/lib/schema";
import { byDay, byWeek } from "@/lib/period";
import { buildDailyAoA } from "./daily";

export interface AiNarrativeSection {
  heading: string;
  lines: string[];
}

function sheetFromAoA(wb: XLSX.WorkBook, name: string, aoa: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

function narrativeSheet(wb: XLSX.WorkBook, name: string, sections: AiNarrativeSection[]) {
  const aoa: (string | number)[][] = [];
  for (const s of sections) {
    aoa.push([s.heading]);
    for (const l of s.lines) aoa.push(["", l]);
    aoa.push([""]);
  }
  sheetFromAoA(wb, name, aoa.length ? aoa : [["No AI narrative generated."]]);
}

function totalsAoA(posts: ConsolidatedPost[]): (string | number)[][] {
  const t = computeTotals(posts);
  return [
    ["Metric", "Value"],
    ["Posts", t.posts],
    ["Spend", Math.round(t.spend)],
    ["Reach (organic + paid)", Math.round(t.reach)],
    ["Views", Math.round(t.views)],
    ["Interactions", t.interactions],
    ["Saves", t.saves],
    ["Shares", t.shares],
    ["Comments", t.comments],
    ["Follows", t.follows],
    ["Profile visits", t.profileVisits],
    ["Engagement rate % (basis reach)", t.engagementRate != null ? Number(t.engagementRate.toFixed(3)) : ""],
  ];
}

function bucketAoA(posts: ConsolidatedPost[]): (string | number)[][] {
  const header = ["Content Bucket", "Posts", "Avg Reach", "Avg Saves", "Avg Shares", "Total Spend", "Avg CPE"];
  const rows = bucketStats(posts).map((b) => [
    b.bucket,
    b.posts,
    Math.round(b.avgReach),
    Math.round(b.avgSaves),
    Math.round(b.avgShares),
    Math.round(b.totalSpend),
    b.avgCpe != null ? Number(b.avgCpe.toFixed(3)) : "",
  ]);
  return [header, ...rows];
}

function formatAoA(posts: ConsolidatedPost[]): (string | number)[][] {
  const header = ["Format", "Posts", "Avg Reach", "Avg Views", "Avg Engagement", "Avg Saves", "Avg Shares"];
  const rows = formatStats(posts)
    .filter((f) => f.format !== "Unknown")
    .map((f) => [
      f.format,
      f.posts,
      Math.round(f.avgReach),
      Math.round(f.avgViews),
      Math.round(f.avgEngagement),
      Math.round(f.avgSaves),
      Math.round(f.avgShares),
    ]);
  return [header, ...rows];
}

function topBottomAoA(posts: ConsolidatedPost[]): (string | number)[][] {
  const scored = scorePosts(posts);
  const header = ["Rank", "Tier", "Description", "Format", "Bucket", "Reach", "Saves", "Shares", "ER%"];
  const row = (p: ConsolidatedPost, rank: number, tier: string) => [
    rank,
    tier,
    (p.description || p.shortcode).slice(0, 80),
    p.format,
    p.contentBucket,
    totalReach(p) ?? "",
    p.saves ?? "",
    p.shares ?? "",
    p.erByInteractions != null ? Number(p.erByInteractions.toFixed(2)) : "",
  ];
  const top = scored.slice(0, 5).map((s, i) => row(s.post, i + 1, "Top"));
  const bottom = scored.slice(-5).reverse().map((s, i) => row(s.post, i + 1, "Lowest"));
  return [header, ...top, [""], ...bottom];
}

/* ------------------------------- DAILY ------------------------------- */
export function buildDailyWorkbook(posts: ConsolidatedPost[], label: string, ai?: AiNarrativeSection[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  sheetFromAoA(wb, "Daily Consolidated", buildDailyAoA(posts));
  sheetFromAoA(wb, "Summary", totalsAoA(posts));
  sheetFromAoA(wb, "Top & Lowest", topBottomAoA(posts));
  sheetFromAoA(wb, "Content Buckets", bucketAoA(posts));
  sheetFromAoA(wb, "Formats", formatAoA(posts));
  if (ai?.length) narrativeSheet(wb, "Strategy (AI)", ai);
  return wb;
}

/* ------------------------------- WEEKLY ------------------------------- */
export function buildWeeklyWorkbook(posts: ConsolidatedPost[], label: string, ai?: AiNarrativeSection[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  sheetFromAoA(wb, "Week Overview", totalsAoA(posts));

  // Day-by-day within the week.
  const days = byDay(posts).sort((a, b) => a.start.getTime() - b.start.getTime());
  const dayHeader = ["Date", "Posts", "Reach", "Views", "Interactions", "Saves", "Shares", "Spend"];
  const dayRows = days.map((d) => {
    const t = computeTotals(d.posts);
    return [d.key, d.posts.length, Math.round(t.reach), Math.round(t.views), t.interactions, t.saves, t.shares, Math.round(t.spend)];
  });
  sheetFromAoA(wb, "By Day", [dayHeader, ...dayRows]);

  sheetFromAoA(wb, "Content Buckets", bucketAoA(posts));
  sheetFromAoA(wb, "Formats", formatAoA(posts));
  sheetFromAoA(wb, "Top & Lowest", topBottomAoA(posts));
  if (ai?.length) narrativeSheet(wb, "Weekly Analysis (AI)", ai);
  return wb;
}

/* ------------------------------- MONTHLY ------------------------------- */
export function buildMonthlyWorkbook(posts: ConsolidatedPost[], label: string, ai?: AiNarrativeSection[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  sheetFromAoA(wb, "Performance Overview", totalsAoA(posts));
  sheetFromAoA(wb, "Content Bucket Analysis", bucketAoA(posts));
  sheetFromAoA(wb, "Format Analysis", formatAoA(posts));
  sheetFromAoA(wb, "Top & Lowest Patterns", topBottomAoA(posts));

  // Week-over-week within the month.
  const weeks = byWeek(posts).sort((a, b) => a.start.getTime() - b.start.getTime());
  const wHeader = ["Week", "Posts", "Reach", "Views", "Interactions", "Saves", "Shares", "Spend"];
  const wRows = weeks.map((w) => {
    const t = computeTotals(w.posts);
    return [w.label, w.posts.length, Math.round(t.reach), Math.round(t.views), t.interactions, t.saves, t.shares, Math.round(t.spend)];
  });
  sheetFromAoA(wb, "Week over Week", [wHeader, ...wRows]);

  if (ai?.length) narrativeSheet(wb, "Monthly Audit (AI)", ai);
  return wb;
}

/* ------------------------------- DOWNLOAD ------------------------------- */
function safe(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
}

export function downloadReport(kind: "daily" | "weekly" | "monthly", posts: ConsolidatedPost[], label: string, ai?: AiNarrativeSection[]): void {
  const wb =
    kind === "daily"
      ? buildDailyWorkbook(posts, label, ai)
      : kind === "weekly"
      ? buildWeeklyWorkbook(posts, label, ai)
      : buildMonthlyWorkbook(posts, label, ai);
  const prefix = kind === "daily" ? "TCL_Daily" : kind === "weekly" ? "TCL_Weekly" : "TCL_Monthly";
  XLSX.writeFile(wb, `${prefix}_${safe(label)}.xlsx`);
}
