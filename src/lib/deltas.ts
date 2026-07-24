/**
 * Month-over-month and week-over-week deltas. Given the accumulated history
 * of view posts, splits into "current" and "previous" bands and returns %
 * changes with the raw values.
 */
import type { ViewPost } from "./view-mode";
import { viewTotals } from "./view-metrics";
import type { ViewTotals } from "./view-metrics";

export interface PeriodBands {
  current: ViewPost[];
  previous: ViewPost[];
  currentLabel: string;
  previousLabel: string;
}

function parseDate(p: ViewPost): Date | null {
  if (!p.publishTime) return null;
  const d = new Date(p.publishTime);
  return isNaN(d.getTime()) ? null : d;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-GB", { month: "short", year: "numeric" });
}

/** Split into current-month vs previous-month bands (calendar-based). */
export function monthBands(posts: ViewPost[]): PeriodBands {
  const withDates = posts.filter((p) => parseDate(p));
  if (!withDates.length) return { current: [], previous: [], currentLabel: "—", previousLabel: "—" };
  const keys = Array.from(new Set(withDates.map((p) => monthKey(parseDate(p)!)))).sort();
  const latest = keys[keys.length - 1];
  const prior = keys.length >= 2 ? keys[keys.length - 2] : null;
  return {
    current: withDates.filter((p) => monthKey(parseDate(p)!) === latest),
    previous: prior ? withDates.filter((p) => monthKey(parseDate(p)!) === prior) : [],
    currentLabel: monthLabel(latest),
    previousLabel: prior ? monthLabel(prior) : "—",
  };
}

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Split into current-week vs previous-week bands (ISO weeks). */
export function weekBands(posts: ViewPost[]): PeriodBands {
  const withDates = posts.filter((p) => parseDate(p));
  if (!withDates.length) return { current: [], previous: [], currentLabel: "—", previousLabel: "—" };
  const keys = Array.from(new Set(withDates.map((p) => isoWeekKey(parseDate(p)!)))).sort();
  const latest = keys[keys.length - 1];
  const prior = keys.length >= 2 ? keys[keys.length - 2] : null;
  return {
    current: withDates.filter((p) => isoWeekKey(parseDate(p)!) === latest),
    previous: prior ? withDates.filter((p) => isoWeekKey(parseDate(p)!) === prior) : [],
    currentLabel: latest,
    previousLabel: prior ?? "—",
  };
}

export interface KpiDelta {
  key: string;
  label: string;
  current: number | null;
  previous: number | null;
  changePct: number | null;
  /** true when a smaller value is *better* (CPR, CPV, CPE, Skip Rate). */
  lowerIsBetter?: boolean;
  format: "int" | "compact" | "pct" | "currency" | "cost" | "seconds";
}

function pctChange(cur: number | null, prev: number | null): number | null {
  if (cur == null || prev == null) return null;
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / prev) * 100;
}

/** Build the KPI comparison rows for the executive summary. */
export function kpiDeltas(cur: ViewTotals, prev: ViewTotals | null): KpiDelta[] {
  const p = prev;
  return [
    { key: "reach", label: "Reach", current: cur.reach, previous: p?.reach ?? null, changePct: pctChange(cur.reach, p?.reach ?? null), format: "compact" },
    { key: "views", label: "Views", current: cur.views, previous: p?.views ?? null, changePct: pctChange(cur.views, p?.views ?? null), format: "compact" },
    { key: "eng", label: "Engagement", current: cur.interactions, previous: p?.interactions ?? null, changePct: pctChange(cur.interactions, p?.interactions ?? null), format: "compact" },
    { key: "spend", label: "Spend", current: cur.spend, previous: p?.spend ?? null, changePct: pctChange(cur.spend, p?.spend ?? null), format: "currency" },
    { key: "follows", label: "Follows", current: cur.follows, previous: p?.follows ?? null, changePct: pctChange(cur.follows, p?.follows ?? null), format: "int" },
    { key: "er", label: "ER%", current: cur.er, previous: p?.er ?? null, changePct: pctChange(cur.er, p?.er ?? null), format: "pct" },
    { key: "cpr", label: "CPR", current: cur.cpr, previous: p?.cpr ?? null, changePct: pctChange(cur.cpr, p?.cpr ?? null), lowerIsBetter: true, format: "cost" },
    { key: "cpv", label: "CPV", current: cur.cpv, previous: p?.cpv ?? null, changePct: pctChange(cur.cpv, p?.cpv ?? null), lowerIsBetter: true, format: "cost" },
    { key: "cpe", label: "CPE", current: cur.cpe, previous: p?.cpe ?? null, changePct: pctChange(cur.cpe, p?.cpe ?? null), lowerIsBetter: true, format: "cost" },
  ];
}
