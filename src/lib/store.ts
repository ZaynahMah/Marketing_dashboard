import localforage from "localforage";
import type { MergeReport } from "./merge";
import type { ConsolidatedPost } from "./schema";

/**
 * PERSISTENCE — single-snapshot model
 * -------------------------------------------------------------------------
 * Rule per the analyst brief: every new upload overwrites the previous
 * analysis. The ONLY thing that persists across uploads is a tiny archive
 * of prior-month KPI totals, used solely for the "Performance vs Previous
 * Month" comparison.
 *
 *   - `activeSnapshotStore` = the current uploaded dataset (the only one).
 *   - `monthArchiveStore`   = a small append-only map of {monthKey → KpiSnapshot}
 *                              seeded from every upload's monthly aggregate.
 *   - Uploading again REPLACES activeSnapshot, ADDS to monthArchive.
 */

export interface UploadSnapshot {
  id: string;
  createdAt: string;
  label: string;
  report: MergeReport;
  posts: ConsolidatedPost[];
  organicFileName?: string;
  paidFileName?: string;
}

export interface KpiSnapshot {
  monthKey: string;
  monthLabel: string;
  reach: number;
  impressions: number;
  views: number;
  interactions: number;
  likes: number;
  saves: number;
  shares: number;
  comments: number;
  follows: number;
  spend: number;
  er: number | null;
  cpe: number | null;
  cpr: number | null;
  cpv: number | null;
  cpf: number | null;
  posts: number;
  archivedAt: string;
}

export interface ActiveSnapshotStore {
  get(): Promise<UploadSnapshot | null>;
  set(s: UploadSnapshot): Promise<void>;
  clear(): Promise<void>;
}

export interface MonthArchiveStore {
  list(): Promise<KpiSnapshot[]>;
  upsertMany(snaps: KpiSnapshot[]): Promise<void>;
  clear(): Promise<void>;
}

const ACTIVE_KEY = "tcl:active-snapshot";
const ARCHIVE_KEY = "tcl:month-archive";

const db =
  typeof window !== "undefined"
    ? localforage.createInstance({ name: "tcl-luxury-analytics", storeName: "state" })
    : null;

export const activeSnapshotStore: ActiveSnapshotStore = {
  async get() {
    if (!db) return null;
    return (await db.getItem<UploadSnapshot>(ACTIVE_KEY)) ?? null;
  },
  async set(s) {
    if (!db) return;
    await db.setItem(ACTIVE_KEY, s);
  },
  async clear() {
    if (!db) return;
    await db.removeItem(ACTIVE_KEY);
  },
};

export const monthArchiveStore: MonthArchiveStore = {
  async list() {
    if (!db) return [];
    const arr = (await db.getItem<KpiSnapshot[]>(ARCHIVE_KEY)) ?? [];
    return arr.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  },
  async upsertMany(snaps) {
    if (!db) return;
    const existing = (await db.getItem<KpiSnapshot[]>(ARCHIVE_KEY)) ?? [];
    const map = new Map(existing.map((s) => [s.monthKey, s]));
    for (const s of snaps) map.set(s.monthKey, s);
    await db.setItem(ARCHIVE_KEY, Array.from(map.values()));
  },
  async clear() {
    if (!db) return;
    await db.removeItem(ARCHIVE_KEY);
  },
};

export function newId(): string {
  return "up_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
