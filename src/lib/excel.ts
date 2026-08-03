import * as XLSX from "xlsx";
import { MASTER_COLUMNS } from "./schema";
import type { ConsolidatedPost } from "./schema";

/** Blank-safe cell: null/undefined become "" so the schema never shifts. */
function cell(v: number | string | null | undefined): number | string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" && !Number.isFinite(v)) return "";
  return v;
}

/**
 * Map a consolidated post to a row object keyed by the MASTER_COLUMNS.
 * Column order is enforced by MASTER_COLUMNS at write time.
 */
function toMasterRow(p: ConsolidatedPost, srNo: number): Record<string, number | string> {
  return {
    "SR.NO": srNo,
    "Post description": cell(p.description),
    "Post Link": cell(p.postLink),
    "Post Format": cell(p.format === "Unknown" ? "" : p.format),
    Objective: cell(p.objective),
    Likes: cell(p.likes),
    Saves: cell(p.saves),
    "Shares ": cell(p.shares),
    Comments: cell(p.comments),
    "Accounts Engaged ": cell(p.accountsEngaged),
    "Interactions ": cell(p.interactions),
    "Accounts Reached  ": cell(p.reach),
    "Views ": cell(p.views),
    "Followers ": cell(p.follows),
    "ER% basis accounts eng ": cell(p.erByEngaged),
    "ER% basis accounts interactions": cell(p.erByInteractions),
  };
}

/** Build the consolidated worksheet rows (array-of-arrays, master order). */
export function buildMasterAoA(posts: ConsolidatedPost[]): (string | number)[][] {
  const header = [...MASTER_COLUMNS] as string[];
  const rows = posts.map((p, i) => {
    const obj = toMasterRow(p, i + 1);
    return header.map((h) => obj[h] ?? "");
  });
  return [header, ...rows];
}

/**
 * Generate the downloadable consolidated workbook.
 * Sheet 1 = master schema (immutable order). Sheet 2 = a wider analytics
 * appendix (paid + derived), so nothing is lost while the master stays pure.
 */
export function buildWorkbook(posts: ConsolidatedPost[], periodLabel?: string): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const master = XLSX.utils.aoa_to_sheet(buildMasterAoA(posts));
  master["!cols"] = MASTER_COLUMNS.map((c) => ({ wch: Math.max(12, Math.min(42, c.length + 6)) }));
  XLSX.utils.book_append_sheet(wb, master, "Consolidated");

  // Analytics appendix — paid + efficiency, never part of the master contract.
  const apxHeader = [
    "SR.NO", "Post Link", "Content Bucket", "Format", "Source",
    "Organic Reach", "Paid Reach", "Views", "Saves", "Shares", "Comments",
    "Spend", "Impressions", "Thruplays", "Paid Engagement", "Profile Visits",
    "CPR", "CPV", "CPE", "CTR%", "CPM", "VTR%", "ER% eng", "Campaign", "Start", "End",
  ];
  const apxRows = posts.map((p, i) => [
    i + 1, p.postLink, p.contentBucket, p.format === "Unknown" ? "" : p.format, p.source,
    cell(p.reach), cell(p.paidReach), cell(p.views), cell(p.saves), cell(p.shares), cell(p.comments),
    cell(p.spend), cell(p.impressions), cell(p.thruplays), cell(p.paidEngagement), cell(p.profileVisits),
    cell(p.cpr), cell(p.cpv), cell(p.cpe), cell(p.ctr), cell(p.cpm), cell(p.vtr), cell(p.erByEngaged),
    cell(p.campaignName), cell(p.startDate), cell(p.endDate),
  ]);
  const apx = XLSX.utils.aoa_to_sheet([apxHeader, ...apxRows]);
  XLSX.utils.book_append_sheet(wb, apx, "Analytics Appendix");

  return wb;
}

/** Trigger a browser download of the consolidated workbook. */
export function downloadWorkbook(posts: ConsolidatedPost[], periodLabel?: string): void {
  const wb = buildWorkbook(posts, periodLabel);
  const stamp = (periodLabel || new Date().toISOString().slice(0, 10)).replace(/[^\w-]+/g, "_");
  XLSX.writeFile(wb, `TCL_Instagram_Consolidated_${stamp}.xlsx`);
}
