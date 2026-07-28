/**
 * Deprecated. The planner has been superseded by the daily-refresh
 * "15 High-Impact Content Ideas" endpoint in /api/ideas + src/lib/ai/ideas.ts.
 * This file remains only to keep types stable for legacy imports.
 */
import type { ConsolidatedPost, PostFormat, ContentBucket } from "./schema";

export interface PlannerEntry {
  day: number;
  postingDay: string;
  bestTime: string;
  bucket: ContentBucket;
  format: PostFormat;
  title: string;
  hook: string;
  captionDirection: string;
  referenceStyle: string;
  objective: string;
  expectedKpi: string;
  reason: string;
  confidence: number;
}

export function buildPlanner(_posts: ConsolidatedPost[]): PlannerEntry[] {
  return [];
}
