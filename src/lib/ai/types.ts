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

/** One of the 15 daily-refresh High-Impact Content Ideas. */
export interface AiContentIdea {
  title: string;
  hook: string;
  description: string;
  brands: string[]; // MUST be from BRAND_CATALOG
  category: string; // product category (e.g. Watches, Fine Jewellery)
  creativeDirection: string;
  format: "Reel" | "Carousel" | "Static" | "Story";
  whyTrendMatters: string; // grounded in live signal
  whyTCLShouldPost: string; // ties to brand register + performance
  cta: string;
  autoDm: boolean;
  liveReference?: string; // the specific trend / editorial / event referenced
}

export interface AiIdeasResponse {
  enabled: boolean;
  generatedFor?: string; // YYYY-MM-DD
  generatedAt?: string;
  cachedUntil?: string;
  fromCache?: boolean;
  ideas?: AiContentIdea[];
  model?: string;
  usage?: AiUsage;
  groundingSources?: AiGroundingSource[];
  reason?: string;
}

/** A performance fact paired with the strategist's read of *why* it happened. */
export interface AiWhy {
  point: string; // references the actual numbers
  why: string; // root cause / hidden pattern
}

/** A ranked action with its expected impact. */
export interface AiAction {
  action: string;
  priority: "High" | "Medium" | "Low";
  expectedImpact: string;
}

/**
 * A single strategist finding, carrying the full five-question analysis so the
 * report reads like consulting output rather than a metric callout.
 */
export interface AiFinding {
  title: string;
  whatHappened: string; // 1. what happened (cites numbers)
  whyItHappened: string; // 2. root cause / hidden pattern
  businessImpact: string; // 3. business impact
  recommendedAction: string; // 4. what to do next
  expectedOutcome: string; // 5. expected impact of the action
  priority: "P1" | "P2" | "P3";
}

/** The embedded strategist analysis, shared across all report levels. */
export interface AiStrategist {
  executiveSummary: string;
  whatWorked: AiFinding[];
  whatDidntWork: AiFinding[];
  whereToActNext: AiFinding[];
  strategicPriorities: AiFinding[];
  risks: AiFinding[];
  growthLevers: AiFinding[];
  opportunities: AiFinding[];
  /** Consulting-style summary: Key Wins / Red Flags / Content Gaps / Audience / Brutal Truth. */
  consulting?: AiConsultingSummary;
}

/* ------- Consulting-style Executive Summary (McKinsey / Bain / BCG voice) ------- */

/** A single bullet with an accompanying supporting metric string. */
export interface AiEvidenceBullet {
  point: string;
  metric: string; // must cite an actual number from the supplied summary
}

export interface AiContentGaps {
  trendsNotLeveraged: AiEvidenceBullet[]; // Quiet Luxury, Craftsmanship, Investment Dressing…
  formatsNotExplored: AiEvidenceBullet[]; // IG Live, Brand Films, POV Reels, Guides, Unboxing…
  audienceSignalsIgnored: AiEvidenceBullet[]; // Gift Guides, Collector Stories, Watch Collectors…
}

export interface AiAudienceInsights {
  saveShareBehaviour: string;
  contentPreferenceSignals: string;
  audienceIntent: string;
  timingInsights: string;
  postingFrequencyInsights: string;
  optimalPostingCadence: string;
}

export interface AiConsultingSummary {
  keyWins: AiEvidenceBullet[];
  redFlags: AiEvidenceBullet[];
  contentGaps: AiContentGaps;
  audienceInsights: AiAudienceInsights;
  brutalTruth: string; // one hard-hitting consulting paragraph — no sugarcoating
}

/* ------- Per-post Analysis (Section 3: Analysis) ------- */

export interface AiPostAnalysis {
  shortcode: string;
  whyItWorked: string;
  whyItFailed: string;
  audienceBehaviourTriggered: string;
  supportingMetrics: string;
  keyLearning: string;
  predictableFutureOpportunity: string;
  recommendedNextIteration: string;
  confidenceScore: number; // 0-100
  verdict: string;
  // Deeper senior-strategist reads (added per Aug '26 brief).
  trendAlignment?: string; // did the post ride a live trend at the time of posting?
  creativeDifferentiation?: string; // felt fresh vs generic?
  storytellingQuality?: string; // narrative depth, emotional beat
  captionEffectiveness?: string; // register, hook line, close, brand credits
  brandPositioning?: string; // luxury signal — reinforced or diluted?
  visualNarrative?: string; // shot design, composition, color story
  ctaQuality?: string; // clarity + softness of the CTA
  timingAndCulturalRelevance?: string; // right week/day/moment?
  whatToRepeat?: string; // concrete pattern to reuse
  whatToImprove?: string; // concrete fix
  whatToAvoid?: string; // what NOT to do again
}

export interface AiContinueStopStart {
  continueDoing: AiEvidenceBullet[];
  stopDoing: AiEvidenceBullet[];
  startDoing: AiEvidenceBullet[];
}

export interface AiAnalysisResponse {
  enabled: boolean;
  generatedAt?: string;
  postAnalyses?: AiPostAnalysis[];
  continueStopStart?: AiContinueStopStart;
  model?: string;
  usage?: AiUsage;
  groundingSources?: AiGroundingSource[];
  reason?: string;
}

/* ------- 50 Brand-Level Content Recommendations (Section 6) ------- */

/** Per-brand mention with a short rationale for why THAT brand fits the idea. */
export interface AiBrandMention {
  brand: string;
  why: string; // one sentence — why this brand is right for this idea
}

export interface AiBrandRecommendation {
  title: string;
  format: "Reel" | "Carousel" | "Static" | "Story" | "Instagram Live" | "Brand Film";
  hook: string; // the opening line, written in TCL voice
  caption: string; // the FULL caption drafted in @tatacliqluxury voice (40-120 words)
  creativeConcept: string; // the story arc / creative direction (2-4 sentences)
  concept: string; // kept for backward compat; mirrors creativeConcept if not populated
  brands: string[]; // catalog-safe brand handles (kept for legacy consumers)
  brandRationale: AiBrandMention[]; // per-brand justification — 3-6 brands typical
  whyItWillWork: string;
  expectedKpiImpact: string;
  audienceIntent: string;
  expectedAudienceBehaviour: string; // WHAT the audience will do + WHY (saves / shares / DMs / conversations)
  trendConnection: string; // NAMED trend, editorial, celebrity moment, seasonal event
  culturalInsight: string; // the deeper why-this-matters-now read
  executionNotes: string;
  difficulty: "Low" | "Medium" | "High";
  predictedPerformance: "Breakout" | "Strong" | "Reliable";
  isFlagshipRecurring: boolean; // fixed number are flagship recurring formats
  flagshipStructure?: string;
}

export interface AiRecommendationsResponse {
  enabled: boolean;
  generatedFor?: string;
  generatedAt?: string;
  cachedUntil?: string;
  fromCache?: boolean;
  recommendations?: AiBrandRecommendation[];
  model?: string;
  usage?: AiUsage;
  groundingSources?: AiGroundingSource[];
  reason?: string;
}

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
  strategist?: AiStrategist;
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
