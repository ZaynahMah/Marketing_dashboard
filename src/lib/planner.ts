import { TCL } from "./brief";
import { fmtCompact, fmtInt } from "./normalize";
import { bucketStats } from "./metrics";
import type { ConsolidatedPost, ContentBucket, PostFormat } from "./schema";

export interface PlannerEntry {
  day: number;
  postingDay: string;
  bestTime: string;
  title: string;
  hook: string;
  captionDirection: string;
  referenceStyle: string;
  objective: string;
  expectedKpi: string;
  reason: string;
  bucket: ContentBucket;
  format: PostFormat;
  confidence: number; // 0-100
}

// Idea templates per bucket, written in the TCL register (maison, not marketplace).
const IDEAS: Partial<Record<ContentBucket, { title: string; hook: string; caption: string; ref: string; objective: string; kpi: string; format: PostFormat }[]>> = {
  Craftsmanship: [
    {
      title: "Anatomy of a Movement",
      hook: "Open on the escapement in extreme macro — no logo for the first three seconds.",
      caption: "Trace one complication from raw brass to finished calibre. Let the craft speak; keep copy sparse and reverent.",
      ref: "Hermès craft films · Loewe 'How It's Made' register",
      objective: "Brand equity · Saves",
      kpi: "Saves + Watch Time",
      format: "Reel",
    },
    {
      title: "The Atelier Series — Hands of the Maison",
      hook: "A single artisan's hands, shot cinematically, resolving into the finished object.",
      caption: "Behind-the-maison storytelling: heritage, patience, rarity. Name the craft, not the discount.",
      ref: "Bottega Veneta craft storytelling",
      objective: "Editorial authority",
      kpi: "Watch Time + Shares",
      format: "Reel",
    },
  ],
  Editorial: [
    {
      title: "5 Ways to Wear It — Occasion Edit",
      hook: "Text-forward cover frame: a sharp POV line, no product yet.",
      caption: "Curation rationale over catalogue. Give the reader a genuinely useful styling intelligence they'll save.",
      ref: "Net-a-Porter editorial · Vogue India styling edits",
      objective: "Saves · Depth of engagement",
      kpi: "Saves + Profile Visits",
      format: "Carousel",
    },
    {
      title: "Trend Decoded — India Adaptation",
      hook: "Global runway moment → 'here's how to wear it in India' turn.",
      caption: "Global trend → India relevance → luxury adaptation → shoppable hook. Our make-it-our-own playbook.",
      ref: "BoF / WWD trend reads, TCL-voiced",
      objective: "Cultural authority",
      kpi: "Shares + Saves",
      format: "Carousel",
    },
  ],
  Occasion: [
    {
      title: "The Gifting Intelligence Guide",
      hook: "'The person who has everything' framing — curatorial, not promotional.",
      caption: "Occasion-led, collector-minded gifting edit. Access and desire, never urgency.",
      ref: "Mytheresa gifting edits",
      objective: "Saves · Consideration",
      kpi: "Saves + Website Clicks",
      format: "Carousel",
    },
  ],
  Influencer: [
    {
      title: "In Conversation — Connoisseur Feature",
      hook: "A tastemaker's genuine POV in the first line, not a brand plug.",
      caption: "Prachi Raniwala / Rochelle Pinto / Nonita Kalra register. Depth and taste over reach.",
      ref: "Tastemaker-led education content",
      objective: "Credibility · Community",
      kpi: "Comments + Follows",
      format: "Reel",
    },
  ],
  Launch: [
    {
      title: "A New House Arrives",
      hook: "Treat the launch as a cultural event — cinematic reveal, not a product drop.",
      caption: "Announce with editorial gravity. The maison joins our world; make it feel like news.",
      ref: "C.L.I.U. cinematic launch language",
      objective: "Awareness · Reach",
      kpi: "Reach + Saves",
      format: "Reel",
    },
  ],
  Celebrity: [
    {
      title: "Spotted — The India Angle",
      hook: "A viral styling moment, reframed for our shelf within the first frame.",
      caption: "Celebrity moment → India relevance → 'shop the register' hook. Clears both trend filters.",
      ref: "Longchamp / watch-moment adaptations",
      objective: "Reach · Cultural relevance",
      kpi: "Reach + Shares",
      format: "Reel",
    },
  ],
  Product: [
    {
      title: "Category Spotlight — The Icon",
      hook: "One hero object, opulent lighting, considered pacing.",
      caption: "Product-in-context, aspirational and precise. Let desire build; avoid transactional language.",
      ref: "Chanel Beauty / Dior Beauty product films",
      objective: "Consideration",
      kpi: "Saves + Profile Visits",
      format: "Reel",
    },
  ],
  Lifestyle: [
    {
      title: "A Day, Elevated",
      hook: "Aspirational lifestyle vignette; product enters naturally, never forced.",
      caption: "Creator-first, effortless-looking. Aspirational without being boring.",
      ref: "Rhode 'everyday routines' register, luxury-adapted",
      objective: "Relatability · Reach",
      kpi: "Reach + Comments",
      format: "Reel",
    },
  ],
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Generate a 30-day calendar. Bucket allocation is weighted by observed
 * save-performance so the plan compounds what already works, while the brief
 * guarantees craft/editorial always appear (business → topical → trend method).
 */
export function buildPlanner(posts: ConsolidatedPost[], start = new Date()): PlannerEntry[] {
  const stats = bucketStats(posts).filter((b) => b.bucket !== "Uncategorised" && b.posts >= 1);
  // Rank buckets by saves; ensure our signature buckets are represented.
  const ranked = [...stats].sort((a, b) => b.avgSaves - a.avgSaves).map((s) => s.bucket);
  const signature: ContentBucket[] = ["Craftsmanship", "Editorial", "Occasion", "Influencer", "Product", "Lifestyle", "Launch"];
  const rotation: ContentBucket[] = [];
  const pool = [...new Set([...ranked, ...signature])].filter((b) => IDEAS[b]);
  if (!pool.length) pool.push("Editorial", "Craftsmanship", "Product");

  // Post ~3x/week (quality over quantity) → ~13 posts in 30 days.
  const cadence = [1, 3, 5]; // Mon, Wed, Fri (0=Sun)
  const entries: PlannerEntry[] = [];
  let idx = 0;
  const ideaCursor: Record<string, number> = {};

  for (let d = 0; d < 30; d++) {
    const date = new Date(start.getTime() + d * 86400000);
    const dow = date.getDay();
    if (!cadence.includes(dow)) continue;

    const bucket = pool[idx % pool.length];
    idx++;
    const ideas = IDEAS[bucket]!;
    const ci = (ideaCursor[bucket] ?? 0) % ideas.length;
    ideaCursor[bucket] = ci + 1;
    const idea = ideas[ci];

    const stat = stats.find((s) => s.bucket === bucket);
    const confidence = confidenceFor(stat?.posts ?? 0, ranked.indexOf(bucket), pool.length);

    entries.push({
      day: d + 1,
      postingDay: DAY_NAMES[dow] + " " + date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      bestTime: dow === 5 ? "7:30 PM" : dow === 3 ? "1:00 PM" : "8:00 PM",
      title: idea.title,
      hook: idea.hook,
      captionDirection: idea.caption,
      referenceStyle: idea.ref,
      objective: idea.objective,
      expectedKpi: idea.kpi,
      bucket,
      format: idea.format,
      confidence,
      reason: stat
        ? `${bucket} averaged ${fmtInt(stat.avgSaves)} saves and ${fmtCompact(stat.avgReach)} reach across ${stat.posts} post(s) this period — among our strongest depth-of-engagement buckets.`
        : `${bucket} is a signature TCL bucket per the content brief; scheduled to maintain a balanced, business-aligned mix.`,
    });
  }
  return entries;
}

function confidenceFor(sampleSize: number, rank: number, poolSize: number): number {
  let base = 55;
  if (rank >= 0) base += Math.round((1 - rank / Math.max(1, poolSize)) * 25); // higher rank → higher confidence
  base += Math.min(15, sampleSize * 3); // more evidence → more confidence
  return Math.max(40, Math.min(95, base));
}
