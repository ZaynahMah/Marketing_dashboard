/**
 * Period engine — groups accumulated posts into day / week / month buckets and
 * decides which report levels are available given the span of data on hand.
 *
 * The dashboard "learns over time": as more daily uploads accumulate in history,
 * weekly (≥1 day, ideally 7) and monthly (current-month accumulation) reports
 * unlock automatically. Everything here is deterministic — no AI.
 */
import type { ConsolidatedPost } from "./schema";

export type ReportLevel = "daily" | "weekly" | "monthly";

export interface PeriodBucket {
  key: string; // stable id, e.g. 2026-05-14 / 2026-W20 / 2026-05
  label: string; // human label
  start: Date;
  end: Date;
  posts: ConsolidatedPost[];
}

export interface PeriodAvailability {
  daysCovered: number;
  firstDate: Date | null;
  lastDate: Date | null;
  daily: boolean;
  weekly: boolean; // ≥1 day of data (partial weeks allowed)
  weeklyComplete: boolean; // ≥7 days
  monthly: boolean; // ≥1 day in the latest month
  monthlyComplete: boolean; // covers a full calendar month
}

function parseDate(p: ConsolidatedPost): Date | null {
  const raw = p.publishTime || p.startDate || null;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ISO week number (1..53). */
export function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Group posts into day buckets, most recent first. */
export function byDay(posts: ConsolidatedPost[]): PeriodBucket[] {
  const map = new Map<string, ConsolidatedPost[]>();
  for (const p of posts) {
    const d = parseDate(p);
    if (!d) continue;
    const key = ymd(d);
    (map.get(key) ?? map.set(key, []).get(key)!).push(p);
  }
  return [...map.entries()]
    .map(([key, ps]) => {
      const d = new Date(key + "T00:00:00");
      return {
        key,
        label: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        start: d,
        end: new Date(d.getTime() + 86399000),
        posts: ps,
      };
    })
    .sort((a, b) => b.start.getTime() - a.start.getTime());
}

/** Group posts into ISO-week buckets, most recent first. */
export function byWeek(posts: ConsolidatedPost[]): PeriodBucket[] {
  const map = new Map<string, { start: Date; posts: ConsolidatedPost[] }>();
  for (const p of posts) {
    const d = parseDate(p);
    if (!d) continue;
    const { year, week } = isoWeek(d);
    const key = `${year}-W${String(week).padStart(2, "0")}`;
    if (!map.has(key)) {
      // Monday of that ISO week.
      const monday = new Date(d);
      const dow = (monday.getDay() + 6) % 7;
      monday.setDate(monday.getDate() - dow);
      monday.setHours(0, 0, 0, 0);
      map.set(key, { start: monday, posts: [] });
    }
    map.get(key)!.posts.push(p);
  }
  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      label: `Week of ${v.start.getDate()} ${MONTHS[v.start.getMonth()]}`,
      start: v.start,
      end: new Date(v.start.getTime() + 7 * 86400000 - 1000),
      posts: v.posts,
    }))
    .sort((a, b) => b.start.getTime() - a.start.getTime());
}

/** Group posts into calendar-month buckets, most recent first. */
export function byMonth(posts: ConsolidatedPost[]): PeriodBucket[] {
  const map = new Map<string, ConsolidatedPost[]>();
  for (const p of posts) {
    const d = parseDate(p);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    (map.get(key) ?? map.set(key, []).get(key)!).push(p);
  }
  return [...map.entries()]
    .map(([key, ps]) => {
      const [y, m] = key.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      return {
        key,
        label: `${MONTHS[m - 1]} ${y}`,
        start,
        end: new Date(y, m, 0, 23, 59, 59),
        posts: ps,
      };
    })
    .sort((a, b) => b.start.getTime() - a.start.getTime());
}

export function availability(posts: ConsolidatedPost[]): PeriodAvailability {
  const dates = posts.map(parseDate).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime());
  if (!dates.length) {
    return {
      daysCovered: 0,
      firstDate: null,
      lastDate: null,
      daily: false,
      weekly: false,
      weeklyComplete: false,
      monthly: false,
      monthlyComplete: false,
    };
  }
  const first = dates[0];
  const last = dates[dates.length - 1];
  const uniqueDays = new Set(dates.map(ymd)).size;
  const spanDays = Math.floor((last.getTime() - first.getTime()) / 86400000) + 1;

  // Monthly-complete: data spans from the 1st to the last day of some month.
  const monthGroups = byMonth(posts);
  const monthlyComplete = monthGroups.some((mb) => {
    const ds = mb.posts.map(parseDate).filter((d): d is Date => !!d);
    const minDay = Math.min(...ds.map((d) => d.getDate()));
    const maxDay = Math.max(...ds.map((d) => d.getDate()));
    const lastOfMonth = new Date(mb.start.getFullYear(), mb.start.getMonth() + 1, 0).getDate();
    return minDay <= 2 && maxDay >= lastOfMonth - 1;
  });

  return {
    daysCovered: uniqueDays,
    firstDate: first,
    lastDate: last,
    daily: uniqueDays >= 1,
    weekly: uniqueDays >= 1,
    weeklyComplete: spanDays >= 7 || uniqueDays >= 7,
    monthly: uniqueDays >= 1,
    monthlyComplete,
  };
}
