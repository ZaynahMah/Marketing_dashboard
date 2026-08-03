import Papa from "papaparse";
import { classifyContent } from "./classify";
import {
  canonicalLink,
  cleanText,
  extractShortcode,
  normaliseFormat,
  num,
  ratio,
  round,
  sumNullable,
} from "./normalize";
import type { ConsolidatedPost, PostFormat } from "./schema";

export interface MergeReport {
  organicRows: number;
  paidRows: number;
  organicPosts: number;
  paidPosts: number;
  matched: number; // in both
  organicOnly: number;
  paidOnly: number;
  consolidated: number;
  warnings: string[];
}

export interface MergeResult {
  posts: ConsolidatedPost[];
  report: MergeReport;
}

/** Parse a File or raw string into rows of {header: value}. */
export async function parseCsv(input: File | string): Promise<Record<string, string>[]> {
  const text = typeof input === "string" ? input : await input.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return (parsed.data || []).filter((r) => Object.values(r).some((v) => cleanText(v) !== ""));
}

/** Find a column value tolerant to header whitespace / case / punctuation. */
function pick(row: Record<string, string>, candidates: string[]): string {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const norm = cand.toLowerCase().replace(/[^a-z0-9]/g, "");
    const hit = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === norm);
    if (hit && row[hit] !== undefined) return row[hit];
  }
  return "";
}

interface OrganicAgg {
  shortcode: string;
  link: string;
  description: string;
  format: PostFormat;
  likes: number | null;
  saves: number | null;
  shares: number | null;
  comments: number | null;
  follows: number | null;
  reach: number | null;
  views: number | null;
  durationSec: number | null;
  publishTime: string | null;
  accountUsername: string | null;
}

/** Aggregate Meta Business Suite rows by shortcode (one row per post expected). */
function aggregateOrganic(rows: Record<string, string>[]): Map<string, OrganicAgg> {
  const map = new Map<string, OrganicAgg>();
  for (const row of rows) {
    const link = pick(row, ["Permalink", "Post Link", "Link"]);
    const shortcode = extractShortcode(link);
    if (!shortcode) continue;
    const format = normaliseFormat(pick(row, ["Post type", "Post Format", "Post Type"]), link);
    const rec: OrganicAgg = {
      shortcode,
      link,
      description: cleanText(pick(row, ["Description", "Post description"])),
      format,
      likes: num(pick(row, ["Likes"])),
      saves: num(pick(row, ["Saves"])),
      shares: num(pick(row, ["Shares"])),
      comments: num(pick(row, ["Comments"])),
      follows: num(pick(row, ["Follows"])),
      reach: num(pick(row, ["Reach"])),
      views: num(pick(row, ["Views"])),
      durationSec: num(pick(row, ["Duration (sec)", "Duration"])),
      publishTime: cleanText(pick(row, ["Publish time", "Date"])) || null,
      accountUsername: cleanText(pick(row, ["Account username", "Account name"])) || null,
    };
    const existing = map.get(shortcode);
    if (!existing) map.set(shortcode, rec);
    else {
      // Same post exported twice — keep richest description, sum counts.
      existing.likes = sumNullable([existing.likes, rec.likes]);
      existing.saves = sumNullable([existing.saves, rec.saves]);
      existing.shares = sumNullable([existing.shares, rec.shares]);
      existing.comments = sumNullable([existing.comments, rec.comments]);
      existing.follows = sumNullable([existing.follows, rec.follows]);
      existing.reach = sumNullable([existing.reach, rec.reach]);
      existing.views = sumNullable([existing.views, rec.views]);
      if (rec.description.length > existing.description.length) existing.description = rec.description;
    }
  }
  return map;
}

interface PaidAgg {
  shortcode: string;
  link: string;
  postName: string;
  format: PostFormat;
  objective: string | null;
  spend: number | null;
  paidReach: number | null;
  impressions: number | null;
  thruplays: number | null;
  engagement: number | null;
  profileVisits: number | null;
  shares: number | null;
  saves: number | null;
  comments: number | null;
  vtrSum: number | null;
  vtrCount: number;
  startDate: string | null;
  endDate: string | null;
}

/** Aggregate paid rows by shortcode — spend and volumes summed across line items. */
function aggregatePaid(rows: Record<string, string>[]): Map<string, PaidAgg> {
  const map = new Map<string, PaidAgg>();
  for (const row of rows) {
    const link = pick(row, ["Link", "Post Link", "Permalink"]);
    const shortcode = extractShortcode(link);
    if (!shortcode) continue;
    const vtr = num(pick(row, ["VTR (%)", "VTR"]));
    const rec: PaidAgg = {
      shortcode,
      link,
      postName: cleanText(pick(row, ["Post Name", "Post description", "Description"])),
      format: normaliseFormat(pick(row, ["Post Type", "Post type"]), link),
      objective: cleanText(pick(row, ["Objective"])) || null,
      spend: num(pick(row, ["Amount Spent", "Spend"])),
      paidReach: num(pick(row, ["Total Reach", "Paid Reach", "Reach"])),
      impressions: num(pick(row, ["Impressions"])),
      thruplays: num(pick(row, ["Thruplays", "Video Plays at 100%"])),
      engagement: num(pick(row, ["Engagement Total", "Engagements"])),
      profileVisits: num(pick(row, ["Profile Visits (Link Clicks)", "Profile Visits"])),
      shares: num(pick(row, ["Shares"])),
      saves: num(pick(row, ["Save", "Saves"])),
      comments: num(pick(row, ["Comments"])),
      vtrSum: vtr,
      vtrCount: vtr !== null ? 1 : 0,
      startDate: cleanText(pick(row, ["Start Date"])) || null,
      endDate: cleanText(pick(row, ["End Date"])) || null,
    };
    const existing = map.get(shortcode);
    if (!existing) map.set(shortcode, rec);
    else {
      existing.spend = sumNullable([existing.spend, rec.spend]);
      existing.paidReach = sumNullable([existing.paidReach, rec.paidReach]);
      existing.impressions = sumNullable([existing.impressions, rec.impressions]);
      existing.thruplays = sumNullable([existing.thruplays, rec.thruplays]);
      existing.engagement = sumNullable([existing.engagement, rec.engagement]);
      existing.profileVisits = sumNullable([existing.profileVisits, rec.profileVisits]);
      existing.shares = sumNullable([existing.shares, rec.shares]);
      existing.saves = sumNullable([existing.saves, rec.saves]);
      existing.comments = sumNullable([existing.comments, rec.comments]);
      existing.vtrSum = sumNullable([existing.vtrSum, rec.vtrSum]);
      existing.vtrCount += rec.vtrCount;
      if (rec.postName.length > existing.postName.length) existing.postName = rec.postName;
      if (!existing.objective && rec.objective) existing.objective = rec.objective;
      if (rec.startDate && (!existing.startDate || rec.startDate < existing.startDate)) existing.startDate = rec.startDate;
      if (rec.endDate && (!existing.endDate || rec.endDate > existing.endDate)) existing.endDate = rec.endDate;
    }
  }
  return map;
}

/**
 * Core merge. Full outer join on shortcode → one consolidated row per post.
 * Never duplicates a post; never drops a post present in either source.
 */
export function mergeData(
  organicRows: Record<string, string>[],
  paidRows: Record<string, string>[]
): MergeResult {
  const organic = aggregateOrganic(organicRows);
  const paid = aggregatePaid(paidRows);
  const warnings: string[] = [];

  const allCodes = new Set<string>([...organic.keys(), ...paid.keys()]);
  const posts: ConsolidatedPost[] = [];
  let matched = 0;
  let organicOnly = 0;
  let paidOnly = 0;

  for (const code of allCodes) {
    const o = organic.get(code);
    const p = paid.get(code);
    const source: ConsolidatedPost["source"] = o && p ? "both" : o ? "organic" : "paid";
    if (source === "both") matched++;
    else if (source === "organic") organicOnly++;
    else paidOnly++;

    const format: PostFormat = o?.format && o.format !== "Unknown" ? o.format : p?.format ?? "Unknown";
    const description = o?.description || p?.postName || "";
    const link = o?.link || p?.link || canonicalLink(code, format);

    // Organic engagement rollups.
    const likes = o?.likes ?? null;
    const saves = o?.saves ?? null;
    const shares = o?.shares ?? null;
    const comments = o?.comments ?? null;
    const follows = o?.follows ?? null;
    const reach = o?.reach ?? null;
    const views = o?.views ?? null;

    const interactions = sumNullable([likes, saves, shares, comments]);
    const accountsEngaged = interactions; // best proxy from Meta export
    const erByEngaged = round(pct(ratio(accountsEngaged, reach)), 2);
    const erByInteractions = round(pct(ratio(interactions, reach)), 2);

    // Paid efficiency.
    const spend = p?.spend ?? null;
    const paidReach = p?.paidReach ?? null;
    const impressions = p?.impressions ?? null;
    const thruplays = p?.thruplays ?? null;
    const paidEngagement = p?.engagement ?? null;
    const profileVisits = p?.profileVisits ?? null;

    const cpr = round(ratio(spend, paidReach), 4);
    const cpv = round(ratio(spend, thruplays), 4);
    const cpe = round(ratio(spend, paidEngagement), 4);
    const ctr = round(pct(ratio(profileVisits, impressions)), 2);
    const cpm = round(spend !== null && impressions ? (spend / impressions) * 1000 : null, 2);
    const vtr = p && p.vtrCount > 0 ? round(ratio(p.vtrSum, p.vtrCount), 2) : null;

    const contentBucket = classifyContent(description, p?.postName);

    posts.push({
      shortcode: code,
      postLink: link,
      description,
      format,
      objective: p?.objective || "",
      contentBucket,
      likes,
      saves,
      shares,
      comments,
      follows,
      reach,
      views,
      durationSec: o?.durationSec ?? null,
      publishTime: o?.publishTime ?? p?.startDate ?? null,
      accountUsername: o?.accountUsername ?? null,
      accountsEngaged,
      interactions,
      erByEngaged,
      erByInteractions,
      hasPaid: !!p,
      spend,
      paidReach,
      impressions,
      thruplays,
      paidEngagement,
      profileVisits,
      paidShares: p?.shares ?? null,
      paidSaves: p?.saves ?? null,
      paidComments: p?.comments ?? null,
      vtr,
      campaignName: p?.postName ?? null,
      campaignObjective: p?.objective ?? null,
      startDate: p?.startDate ?? null,
      endDate: p?.endDate ?? null,
      cpr,
      cpv,
      cpe,
      ctr,
      cpm,
      source,
    });
  }

  // Sort by total reach desc so the sheet leads with the biggest posts.
  posts.sort((a, b) => (totalReach(b) ?? 0) - (totalReach(a) ?? 0));

  if (organic.size === 0) warnings.push("No organic posts detected — check the Meta Business Suite export has a Permalink column.");
  if (paid.size === 0) warnings.push("No paid posts detected — check the Paid Data export has a Link column.");
  if (paidOnly > 0) warnings.push(`${paidOnly} paid post(s) had no organic match — included with organic metrics left blank.`);

  return {
    posts,
    report: {
      organicRows: organicRows.length,
      paidRows: paidRows.length,
      organicPosts: organic.size,
      paidPosts: paid.size,
      matched,
      organicOnly,
      paidOnly,
      consolidated: posts.length,
      warnings,
    },
  };
}

function pct(r: number | null): number | null {
  return r === null ? null : r * 100;
}

export function totalReach(p: ConsolidatedPost): number | null {
  return sumNullable([p.reach, p.paidReach]);
}

/** Convenience: parse both files and merge in one call. */
export async function mergeFiles(organicFile: File | string, paidFile: File | string): Promise<MergeResult> {
  const [org, paid] = await Promise.all([parseCsv(organicFile), parseCsv(paidFile)]);
  return mergeData(org, paid);
}
