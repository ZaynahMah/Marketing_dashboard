import localforage from "localforage";
import type { MergeReport } from "./merge";
import type { ConsolidatedPost } from "./schema";

/**
 * PERSISTENCE
 * -------------------------------------------------------------------------
 * Default adapter: IndexedDB (via localforage) — historical uploads persist
 * per browser with zero backend config, so the app runs on Vercel instantly.
 *
 * To make history shared across the team, swap this module for a Postgres /
 * Supabase adapter implementing the same `HistoryStore` interface. The rest of
 * the app depends only on this interface, so nothing else changes.
 * See README → "Upgrading to a shared database".
 */

export interface UploadSnapshot {
  id: string;
  createdAt: string;
  label: string; // reporting period label
  report: MergeReport;
  posts: ConsolidatedPost[];
  organicFileName?: string;
  paidFileName?: string;
}

export interface HistoryStore {
  list(): Promise<UploadSnapshot[]>;
  get(id: string): Promise<UploadSnapshot | null>;
  save(s: UploadSnapshot): Promise<void>;
  remove(id: string): Promise<void>;
}

const KEY = "tcl:uploads:index";

const db = typeof window !== "undefined"
  ? localforage.createInstance({ name: "tcl-luxury-analytics", storeName: "uploads" })
  : null;

export const historyStore: HistoryStore = {
  async list() {
    if (!db) return [];
    const ids = (await db.getItem<string[]>(KEY)) ?? [];
    const items: UploadSnapshot[] = [];
    for (const id of ids) {
      const s = await db.getItem<UploadSnapshot>(id);
      if (s) items.push(s);
    }
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async get(id) {
    if (!db) return null;
    return (await db.getItem<UploadSnapshot>(id)) ?? null;
  },
  async save(s) {
    if (!db) return;
    await db.setItem(s.id, s);
    const ids = (await db.getItem<string[]>(KEY)) ?? [];
    if (!ids.includes(s.id)) await db.setItem(KEY, [s.id, ...ids]);
  },
  async remove(id) {
    if (!db) return;
    await db.removeItem(id);
    const ids = (await db.getItem<string[]>(KEY)) ?? [];
    await db.setItem(KEY, ids.filter((x) => x !== id));
  },
};

export function newId(): string {
  return "up_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
