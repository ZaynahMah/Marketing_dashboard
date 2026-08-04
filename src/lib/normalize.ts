import type { PostFormat } from "./schema";

/**
 * Extract the stable Instagram shortcode from any permalink variant.
 * Handles /reel/, /reels/, /p/, /tv/ and trailing query params.
 * This is THE join key — every merge decision routes through here.
 */
export function extractShortcode(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = String(url).match(/\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/** Canonical link we store in the master sheet (always /reel/ or /p/, no query). */
export function canonicalLink(shortcode: string, format: PostFormat): string {
  const seg = format === "Reel" || format === "Video" ? "reel" : "p";
  return `https://www.instagram.com/${seg}/${shortcode}/`;
}

/**
 * Parse a numeric cell that may contain commas, currency (₹/Rs), percent
 * signs, whitespace, or placeholder dashes. Returns null for empty/unknown.
 */
export function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s === "" || s === "-" || s === "—" || s === "N/A" || s === "NA" || s === "#DIV/0!") return null;
  s = s.replace(/[₹%,]/g, "").replace(/Rs\.?/gi, "").replace(/\s+/g, "");
  if (s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Sum a list of nullable numbers; returns null only if every value is null. */
export function sumNullable(vals: (number | null)[]): number | null {
  let any = false;
  let total = 0;
  for (const v of vals) {
    if (v !== null) {
      any = true;
      total += v;
    }
  }
  return any ? total : null;
}

/** Safe division that returns null on divide-by-zero or missing inputs. */
export function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
}

export function round(v: number | null, dp = 2): number | null {
  if (v === null) return null;
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
}

/** Normalise a raw Meta/paid "Post type" string to our format enum. */
export function normaliseFormat(raw: string | null | undefined, link?: string | null): PostFormat {
  const s = (raw || "").toLowerCase();
  if (s.includes("reel")) return "Reel";
  if (s.includes("carousel") || s.includes("album")) return "Carousel";
  if (s.includes("story") || s.includes("stories")) return "Story";
  if (s.includes("video")) return "Video";
  if (s.includes("image") || s.includes("photo") || s.includes("static") || s.includes("single")) return "Static";
  // Fall back to the link shape.
  if (link && /\/reels?\//.test(link)) return "Reel";
  if (link && /\/p\//.test(link)) return "Static";
  return "Unknown";
}

export function cleanText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

/** Format a number for display with Indian-style grouping. */
export function fmtInt(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return Math.round(v).toLocaleString("en-IN");
}

export function fmtCurrency(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return "₹" + Math.round(v).toLocaleString("en-IN");
}

/** Cost metrics (CPV/CPE/CPR/CPM) are often sub-rupee — keep decimals. */
export function fmtCost(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 100) return "₹" + Math.round(v).toLocaleString("en-IN");
  if (Math.abs(v) >= 1) return "₹" + v.toFixed(2);
  return "₹" + v.toFixed(3);
}

export function fmtPct(v: number | null | undefined, dp = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toFixed(dp) + "%";
}

export function fmtCompact(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e7) return (v / 1e7).toFixed(2) + "Cr";
  if (abs >= 1e5) return (v / 1e5).toFixed(2) + "L";
  if (abs >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(Math.round(v));
}
