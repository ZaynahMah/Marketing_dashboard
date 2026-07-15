/**
 * MASTER OUTPUT SCHEMA
 * -------------------------------------------------------------------------
 * This is the single authoritative column order for the downloadable Excel,
 * mirrored exactly from "Insta Analytics Post Data Sheet 2026 TCL".
 * The order MUST NOT change. If a value is unavailable we emit "" (blank)
 * rather than altering the schema. Treat this array as the master contract.
 */
export const MASTER_COLUMNS = [
  "SR.NO",
  "Post description",
  "Post Link",
  "Post Format",
  "Objective",
  "Likes",
  "Saves",
  "Shares ",
  "Comments",
  "Accounts Engaged ",
  "Interactions ",
  "Accounts Reached  ",
  "Views ",
  "Followers ",
  "ER% basis accounts eng ",
  "ER% basis accounts interactions",
] as const;

export type MasterColumn = (typeof MASTER_COLUMNS)[number];

/** A single consolidated post — the app's atomic unit of truth. */
export interface ConsolidatedPost {
  /** Instagram shortcode — the join key across organic + paid exports. */
  shortcode: string;
  postLink: string;
  description: string;
  format: PostFormat;
  objective: string;
  contentBucket: ContentBucket;

  // Organic (Meta Business Suite)
  likes: number | null;
  saves: number | null;
  shares: number | null;
  comments: number | null;
  follows: number | null;
  reach: number | null; // organic reach
  views: number | null; // organic views
  durationSec: number | null;
  publishTime: string | null;
  accountUsername: string | null;

  // Derived organic
  accountsEngaged: number | null;
  interactions: number | null;
  erByEngaged: number | null;
  erByInteractions: number | null;

  // Paid (aggregated across all campaign line items for this post)
  hasPaid: boolean;
  spend: number | null;
  paidReach: number | null;
  impressions: number | null;
  thruplays: number | null;
  paidEngagement: number | null;
  profileVisits: number | null;
  paidShares: number | null;
  paidSaves: number | null;
  paidComments: number | null;
  vtr: number | null;
  campaignName: string | null;
  campaignObjective: string | null;
  startDate: string | null;
  endDate: string | null;

  // Derived paid efficiency
  cpr: number | null; // cost per reach
  cpv: number | null; // cost per view (thruplay)
  cpe: number | null; // cost per engagement
  ctr: number | null;
  cpm: number | null;

  // Provenance
  source: "both" | "organic" | "paid";
}

export type PostFormat = "Reel" | "Carousel" | "Static" | "Story" | "Video" | "Unknown";

export type ContentBucket =
  | "Celebrity"
  | "Product"
  | "Lifestyle"
  | "Editorial"
  | "Brand Story"
  | "Craftsmanship"
  | "Launch"
  | "Campaign"
  | "Influencer"
  | "Sale"
  | "Pre-Owned"
  | "Occasion"
  | "Uncategorised";
