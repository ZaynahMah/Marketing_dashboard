/**
 * Types for the optional Gemini strategy/narrative layer.
 *
 * This layer NEVER computes metrics. The deterministic engine (src/lib/*) remains
 * the single source of truth for every number. Gemini only authors prose/strategy
 * from an already-computed compact summary, and its output is always optional:
 * when no API key is configured, the dashboard falls back to deterministic output.
 */
import type { ContentBucket, PostFormat } from "@/lib/schema";

export type AiModelId =
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite"
  | "gemini-2.5-pro"
  | "gemini-3.5-flash"
  | "gemini-3.1-pro-preview";

/** Compact, numbers-only snapshot sent to the model. No raw CSV, no PII. */
export interface AiSummary {
  period: string;
  comparedTo: string | null;
  totals: Record<string, number | null>;
  deltas?: Record<string, number | null>; // % change vs previous period
  buckets: {
    bucket: ContentBucket;
    posts: number;
    avgReach: number;
    avgSaves: number;
    avgShares: number;
    avgCpe: number | null;
    totalSpend: number;
  }[];
  formats: { format: PostFormat; posts: number; avgReach: number; avgEngagement: number; avgSaves: number }[];
  topPerformers: AiPostBrief[];
  lowPerformers: AiPostBrief[];
  strategicInsights: { kind: string; title: string; body: string }[];
  paid: { totalSpend: number; cpr: number | null; cpv: number | null; cpe: number | null; ctr: number | null };
}

export interface AiPostBrief {
  description: string;
  format: PostFormat;
  bucket: ContentBucket;
  reach: number;
  saves: number;
  shares: number;
  comments: number;
  engagementRate: number | null;
  spend: number | null;
}

/* ----------------------------- AI output shapes ----------------------------- */
export interface AiRec {
  headline: string;
  rationale: string; // must reference the numbers from the summary
  brandAlignment: string; // ties to the TCL brief
  priority: "High" | "Medium" | "Low";
}

export interface AiStrategyBlock {
  theme: string;
  direction: string;
  reference: string; // magazine / brand / cultural moment from the brief or live web
}

export interface AiPlannerDay {
  day: number;
  postingDay: string;
  bucket: string;
  format: string;
  title: string;
  hook: string;
  captionDirection: string;
  reference: string;
  objective: string;
  expectedKpi: string;
  reason: string;
}

export interface AiNextIdea {
  title: string;
  why: string; // grounded in performance + brief
  format: string;
  bucket: string;
}

export interface AiBudgetItem {
  target: string; // bucket / campaign type
  move: "Increase" | "Hold" | "Decrease";
  rationale: string; // cites CPE / spend numbers
}

export interface AiOpportunity {
  title: string;
  source: string; // live trend / fashion week / cultural moment
  angle: string; // how TCL should play it, in the maison register
}

export interface AiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  thoughtsTokens?: number;
  totalTokens: number;
  groundingQueries: number;
  estimatedCostUsd: number | null;
  costBreakdown?: { input: number; output: number; grounding: number };
}

export interface AiGroundingSource {
  title: string;
  url: string;
}

export type AiReportType = "daily" | "weekly" | "monthly";

/* ------- Weekly framework (senior-strategist weekly review) ------- */
export interface AiWeeklyReport {
  contentInsights: {
    best: string;
    worst: string;
    themesThatWorked: string[];
    themesThatDidnt: string[];
    nextWeekDirection: string;
  };
  consumerConversations: {
    talkingAbout: string[];
    commonQuestions: string[];
    interests: string[];
    painPoints: string[];
    note: string;
  };
  trendWatch: {
    fashion: string[];
    cultural: string[];
    platform: string[];
    emergingFormats: string[];
    participateNext: string[];
  };
  sentiment: {
    positive: string;
    neutral: string;
    negative: string;
    direction: "Improving" | "Stable" | "Declining";
    note: string;
  };
  influencerReview: { note: string; authentic: string[]; scale: string[] };
  ugcReview: { note: string; amplify: string[] };
  campaignLearnings: { scale: string[]; stop: string[]; optimize: string[] };
  brandHealth: { note: string; reads: { attribute: string; strength: number }[] };
  businessLevel: { topCategories: string[]; topBrands: string[]; focusNext: string[] };
  audienceIntelligence: { note: string; patterns: string[] };
}

/* ------- Monthly Instagram audit (handle-level) ------- */
export interface AiMonthlyReport {
  performanceOverview: string;
  keyWins: string[];
  redFlags: string[];
  formatAnalysis: { note: string; increase: string[]; luxuryBenchmark: string };
  contentPatterns: {
    topPatterns: { pattern: string; why: string }[];
    poorPatterns: { pattern: string; why: string }[];
  };
  audienceInsights: { saveBehaviour: string; shareBehaviour: string; engagementBehaviour: string };
  contentBuckets: { bucket: string; performance: string; recommendation: string }[];
  brandPositionAudit: { worked: string; didnt: string; positioningMatch: string };
  competitiveIntelligence: { competitor: string; theyDoBetter: string; weDoBetter: string; opportunity: string }[];
  whiteSpace: string[];
  strategicRecommendations: { stopDoing: string[]; continueDoing: string[]; startDoing: string[] };
}

export interface AiReport {
  reportType: AiReportType;
  model: string;
  generatedAt: string;
  grounded: boolean;
  groundingSources: AiGroundingSource[];
  executiveSummary?: string;
  strategicRecommendations: AiRec[];
  contentStrategy: AiStrategyBlock[];
  planner: AiPlannerDay[];
  whatToPostNext: AiNextIdea[];
  budgetAllocation: AiBudgetItem[];
  emergingOpportunities: AiOpportunity[];
  weekly?: AiWeeklyReport;
  monthly?: AiMonthlyReport;
  usage: AiUsage;
}

/** Response envelope from POST /api/ai. */
export type AiResponse =
  | { enabled: true; report: AiReport }
  | { enabled: false; reason: string };

/** Response from GET /api/ai (status probe). */
export interface AiStatus {
  enabled: boolean;
  defaultModel: AiModelId;
}
