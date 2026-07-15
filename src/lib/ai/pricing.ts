/**
 * Gemini model catalogue + pricing.
 *
 * Prices are USD per 1,000,000 tokens (input / output) and reflect published
 * Google AI (Gemini Developer API) rates as of July 2026. Output includes
 * "thinking" tokens on the 2.5+ reasoning models. Grounding with Google Search
 * is billed separately once free quotas are exhausted.
 *
 * These are ESTIMATES for display only — the API does not return a cost figure.
 * Update this table if Google changes pricing.
 */
import type { AiModelId } from "./types";

export interface ModelPricing {
  id: AiModelId;
  label: string;
  tier: "light" | "balanced" | "high";
  inputPerM: number;
  outputPerM: number;
  /** Search grounding: 2.5 track bills per grounded prompt; 3.x track bills per query. */
  groundingPerThousand: number;
  groundingUnit: "prompt" | "query";
  note: string;
}

export const MODELS: Record<AiModelId, ModelPricing> = {
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    tier: "light",
    inputPerM: 0.3,
    outputPerM: 2.5,
    groundingPerThousand: 35,
    groundingUnit: "prompt",
    note: "Default. Fast, low-cost, strong enough for strategy narrative.",
  },
  "gemini-2.5-flash-lite": {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    tier: "light",
    inputPerM: 0.1,
    outputPerM: 0.4,
    groundingPerThousand: 35,
    groundingUnit: "prompt",
    note: "Cheapest. Best for high-frequency refreshes.",
  },
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    tier: "high",
    inputPerM: 1.25,
    outputPerM: 10,
    groundingPerThousand: 35,
    groundingUnit: "prompt",
    note: "Higher-quality reasoning for board-level narrative.",
  },
  "gemini-3.5-flash": {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    tier: "balanced",
    inputPerM: 1.5,
    outputPerM: 9,
    groundingPerThousand: 14,
    groundingUnit: "query",
    note: "Frontier Flash with native grounding.",
  },
  "gemini-3.1-pro-preview": {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    tier: "high",
    inputPerM: 2,
    outputPerM: 12,
    groundingPerThousand: 14,
    groundingUnit: "query",
    note: "Flagship reasoning. Highest quality, highest cost.",
  },
};

export const DEFAULT_MODEL: AiModelId = "gemini-2.5-flash";

export function isValidModel(id: string): id is AiModelId {
  return id in MODELS;
}

export interface CostInput {
  model: AiModelId;
  inputTokens: number;
  outputTokens: number;
  groundingQueries: number;
}

export function estimateCost({ model, inputTokens, outputTokens, groundingQueries }: CostInput) {
  const p = MODELS[model];
  if (!p) return { total: null as number | null, input: 0, output: 0, grounding: 0 };
  const input = (inputTokens / 1_000_000) * p.inputPerM;
  const output = (outputTokens / 1_000_000) * p.outputPerM;
  // Grounding: 2.5 charges per grounded prompt (so ≥1 grounded response = 1 unit);
  // 3.x charges per query. Free quotas are ignored here (conservative upper bound).
  const units = p.groundingUnit === "prompt" ? (groundingQueries > 0 ? 1 : 0) : groundingQueries;
  const grounding = (units / 1000) * p.groundingPerThousand;
  return { total: input + output + grounding, input, output, grounding };
}
