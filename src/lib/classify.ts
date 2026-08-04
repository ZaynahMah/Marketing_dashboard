import { BUCKET_KEYWORDS } from "./brief";
import type { ContentBucket } from "./schema";

/**
 * Classify a post into a TCL content bucket from its description + campaign name.
 * Deterministic keyword scoring, ordered so specific intents beat broad ones.
 * Returns "Uncategorised" only when nothing matches — never a random guess.
 */
export function classifyContent(text: string, campaignName?: string | null): ContentBucket {
  const haystack = `${text || ""} ${campaignName || ""}`.toLowerCase();
  if (!haystack.trim()) return "Uncategorised";

  let best: { bucket: string; score: number } | null = null;
  for (let i = 0; i < BUCKET_KEYWORDS.length; i++) {
    const { bucket, terms } = BUCKET_KEYWORDS[i];
    let score = 0;
    for (const t of terms) {
      if (haystack.includes(t)) score += t.length >= 6 ? 2 : 1; // longer terms are more specific
    }
    // Priority tiebreak: earlier buckets carry a tiny positional bonus.
    const adjusted = score > 0 ? score + (BUCKET_KEYWORDS.length - i) * 0.01 : 0;
    if (adjusted > 0 && (!best || adjusted > best.score)) best = { bucket, score: adjusted };
  }

  return (best?.bucket as ContentBucket) ?? "Uncategorised";
}
