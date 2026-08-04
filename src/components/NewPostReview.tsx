"use client";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Card, Empty, Eyebrow, Pill, SectionTitle } from "@/components/ui";
import { BRAND_CATALOG } from "@/lib/brand-catalog";
import type { ConsolidatedPost } from "@/lib/schema";
import { viewTotals } from "@/lib/view-metrics";
import { toViewPosts } from "@/lib/view-mode";
import { getSessionCache, setSessionCache, clearSessionCachePrefix } from "@/lib/session-cache";

/* ---------- Types ---------- */

interface ReviewResponse {
  enabled: boolean;
  review?: Record<string, unknown>;
  model?: string;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number; estimatedCostUsd?: number };
  reason?: string;
}

/* ---------- Helpers ---------- */

function resizeImage(file: File, maxDim = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (file.type.startsWith("video/")) {
        resolve(reader.result as string);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildHistCtx(posts: ConsolidatedPost[]): string {
  if (!posts.length) return "";
  const view = toViewPosts(posts, "total");
  const t = viewTotals(view);
  const fmtMap = view.reduce<Record<string, number>>((m, p) => ((m[p.format] = (m[p.format] ?? 0) + 1), m), {});
  const topFmts = Object.entries(fmtMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(", ");
  return `Dataset: ${view.length} posts. Median ER: ${(t.er ?? 0).toFixed(2)}%. Total Reach: ${t.reach.toLocaleString("en-IN")}, Saves: ${t.saves.toLocaleString("en-IN")}, Shares: ${t.shares.toLocaleString("en-IN")}. Spend: ₹${t.spend.toLocaleString("en-IN")}. CPE: ${t.cpe?.toFixed(2) ?? "N/A"}, CPR: ${t.cpr?.toFixed(4) ?? "N/A"}. Top formats: ${topFmts}`;
}

const SCORE_COLOUR = (n: number) => n >= 85 ? "text-positive" : n >= 65 ? "text-claret" : "text-negative";

/* ---------- Component ---------- */

interface Props {
  posts: ConsolidatedPost[];
}

export function NewPostReview({ posts }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [brand, setBrand] = useState("");
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const brands = useMemo(() => Object.keys(BRAND_CATALOG).sort(), []);
  const histCtx = useMemo(() => buildHistCtx(posts), [posts]);

  const addFiles = useCallback(async (incoming: File[]) => {
    const mediaFiles = incoming.filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!mediaFiles.length) return;
    setFiles((prev) => [...prev, ...mediaFiles]);
    const uris = await Promise.all(mediaFiles.map((f) => resizeImage(f)));
    setPreviews((prev) => [...prev, ...uris]);
  }, []);

  const removeFile = useCallback((idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Build a stable cache key from the current inputs.
  const cacheKey = useMemo(() => {
    if (!previews.length) return "";
    // Hash from preview count + caption length + brand — lightweight fingerprint.
    return `review:${previews.length}:${caption.length}:${brand}`;
  }, [previews, caption, brand]);

  // On mount or when cacheKey changes, restore cached result if available.
  const cachedResult = cacheKey ? getSessionCache<ReviewResponse>(cacheKey) : null;
  const displayResult = result ?? cachedResult;
  const displayStatus = result ? status : cachedResult?.enabled ? "ready" : status;

  // Mark inputs as dirty when they change after a review.
  const [inputsChanged, setInputsChanged] = useState(false);
  const lastReviewedKey = useRef("");

  const onInputChange = useCallback(() => {
    if (lastReviewedKey.current && lastReviewedKey.current !== cacheKey) {
      setInputsChanged(true);
    }
  }, [cacheKey]);

  // Track input changes.
  const prevCacheKeyRef = useRef(cacheKey);
  if (prevCacheKeyRef.current !== cacheKey) {
    prevCacheKeyRef.current = cacheKey;
    if (lastReviewedKey.current) setInputsChanged(true);
  }

  function runReview() {
    if (!previews.length) return;
    setStatus("loading");
    setResult(null);
    setInputsChanged(false);
    fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images: previews.filter((p) => p.startsWith("data:image/")),
        caption,
        brand: brand || undefined,
        historicalContext: histCtx || undefined,
      }),
    })
      .then((r) => r.json())
      .then((data: ReviewResponse) => {
        if (!data.enabled) {
          setStatus("error");
          setResult(data);
          return;
        }
        setResult(data);
        setStatus("ready");
        lastReviewedKey.current = cacheKey;
        if (cacheKey) setSessionCache(cacheKey, data);
      })
      .catch(() => setStatus("error"));
  }

  const r = displayResult?.review as Record<string, unknown> | undefined;

  // Safe accessors for nested objects.
  const obj = (key: string) => (r?.[key] as Record<string, unknown>) ?? {};
  const arr = (key: string) => (r?.[key] as unknown[]) ?? [];
  const str = (key: string, sub?: string) => {
    if (sub) return String((obj(key)[sub] as string) ?? "");
    return String((r?.[key] as string) ?? "");
  };
  const num = (key: string, sub?: string) => {
    const raw = sub ? obj(key)[sub] : r?.[key];
    return typeof raw === "number" ? raw : 0;
  };

  return (
    <div className="fade-in">
      <SectionTitle
        eyebrow="Pre-Publish Review"
        title="New Post"
        hint="Upload your draft creative(s) and caption before publishing. The AI Creative Director reviews against TCL voice, current trends, competitor activity, and historical performance — then tells you how to make it stronger."
      />

      {/* Upload zone */}
      <div
        className={`mb-6 rounded-card border-2 border-dashed bg-surface p-8 text-center transition-colors ${dragOver ? "border-claret bg-claret/5" : "border-line"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
      >
        <div className="mb-4 text-[13px] text-slate">
          Drag & drop your images, carousel slides, or a video — or click to browse.
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-ink px-5 py-2 text-[12px] font-medium text-paper hover:opacity-90"
        >
          Browse files
        </button>
        <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
      </div>

      {/* Media preview */}
      {previews.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          {previews.map((p, i) => (
            <div key={i} className="group relative">
              {p.startsWith("data:video/") ? (
                <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-line bg-veil text-[11px] text-slate">Video</div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p} alt={`Slide ${i + 1}`} className="h-28 w-28 rounded-lg border border-line object-cover" />
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-negative text-[10px] text-paper group-hover:flex"
              >
                ×
              </button>
              <span className="absolute bottom-1 left-1 eyebrow rounded bg-ink/70 px-1.5 text-paper">{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {/* Caption + brand selector */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="eyebrow mb-1.5 block text-mist">Caption (optional)</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Paste your draft caption here…"
            className="w-full rounded-card border border-line bg-surface p-4 text-[13px] text-ink placeholder:text-mist focus:border-claret focus:outline-none"
            rows={4}
          />
        </div>
        <div>
          <label className="eyebrow mb-1.5 block text-mist">Brand (optional)</label>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full rounded-card border border-line bg-surface p-3 text-[13px] text-ink focus:border-claret focus:outline-none"
          >
            <option value="">Select brand…</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Review Content button */}
      {previews.length > 0 && (
        <div className="mb-6">
          <button
            onClick={runReview}
            disabled={displayStatus === "loading"}
            className="rounded-full bg-ink px-6 py-2.5 text-[13px] font-medium text-paper hover:opacity-90 disabled:opacity-50"
          >
            {displayStatus === "loading" ? "Reviewing…" : inputsChanged ? "Re-review Content" : "Review Content"}
          </button>
          {inputsChanged && displayResult && (
            <span className="ml-3 text-[11px] text-claret">Inputs changed since last review — click to re-review.</span>
          )}
        </div>
      )}

      {/* Loading */}
      {displayStatus === "loading" && (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-[13px] text-slate">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-claret" />
            Reviewing your creative — checking TCL voice, scanning competitor feeds, grounding in current trends…
          </div>
        </Card>
      )}
      {displayStatus === "error" && <Empty title="Review unavailable" body={displayResult?.reason ?? "Check GEMINI_API_KEY is set in Vercel."} />}

      {/* Results */}
      {displayStatus === "ready" && r && (
        <div className="space-y-6">
          {/* Overall score + verdict */}
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="text-center">
                <div className={`display text-[48px] font-medium ${SCORE_COLOUR(num("overallScore"))}`}>
                  {num("overallScore")}<span className="text-[20px] text-mist">/100</span>
                </div>
              </div>
              <div className="flex-1">
                <Pill tone={num("overallScore") >= 85 ? "win" : num("overallScore") >= 65 ? "accent" : "risk"}>
                  {str("publishRecommendation")}
                </Pill>
                <p className="mt-2 text-[13px] leading-relaxed text-ink">{str("publishExplanation")}</p>
              </div>
            </div>
          </Card>

          {/* Brand voice alignment */}
          <ReviewSection title="Brand Voice Alignment" score={num("brandVoiceAlignment", "score")}>
            <div className="grid gap-2 md:grid-cols-2">
              {(["soundsPremium", "soundsEditorial", "soundsAspirational", "emotionallyEngaging", "luxuryFirst"] as const).map((k) => (
                <div key={k} className="text-[12px]">
                  <span className="text-mist">{k.replace(/([A-Z])/g, " $1").trim()} · </span>
                  <span className="text-ink">{String(obj("brandVoiceAlignment")[k] ?? "")}</span>
                </div>
              ))}
            </div>
            {(obj("brandVoiceAlignment").improvements as string[] ?? []).length > 0 && (
              <div className="mt-3 space-y-1">
                <Eyebrow>Improvements</Eyebrow>
                {(obj("brandVoiceAlignment").improvements as string[]).map((s, i) => (
                  <p key={i} className="text-[12px] text-graphite">· {s}</p>
                ))}
              </div>
            )}
          </ReviewSection>

          {/* Visual review */}
          <ReviewSection title="Visual Review" score={num("visualReview", "overallVisualScore")}>
            <div className="grid gap-2 md:grid-cols-2">
              {(["luxuryFeel", "composition", "typography", "colourPalette", "storytelling", "productProminence", "premiumPerception", "carouselFlow"] as const).map((k) => {
                const val = String(obj("visualReview")[k] ?? "");
                if (!val || val === "N/A") return null;
                return (
                  <div key={k} className="text-[12px]">
                    <span className="text-mist">{k.replace(/([A-Z])/g, " $1").trim()} · </span>
                    <span className="text-ink">{val}</span>
                  </div>
                );
              })}
            </div>
          </ReviewSection>

          {/* Caption review */}
          <ReviewSection title="Caption Review" score={num("captionReview", "overallCaptionScore")}>
            <div className="mb-3 flex flex-wrap gap-3">
              {(["hookScore", "flowScore", "luxuryLanguageScore", "ctaScore", "emotionalPullScore", "shareabilityScore", "saveabilityScore"] as const).map((k) => (
                <div key={k} className="text-center">
                  <div className={`tabular text-[16px] font-medium ${SCORE_COLOUR(num("captionReview", k))}`}>{num("captionReview", k)}</div>
                  <div className="text-[10px] text-mist">{k.replace("Score", "").replace(/([A-Z])/g, " $1").trim()}</div>
                </div>
              ))}
            </div>
            <p className="text-[12px] leading-relaxed text-graphite">{String(obj("captionReview").feedback ?? "")}</p>
            {String(obj("captionReview").rewrittenCaption ?? "") && (
              <div className="mt-4 rounded-md border border-line bg-veil/40 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <Eyebrow>Rewritten caption · ready to publish</Eyebrow>
                  <button
                    onClick={() => navigator.clipboard?.writeText(String(obj("captionReview").rewrittenCaption))}
                    className="eyebrow text-mist hover:text-claret"
                  >
                    Copy
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{String(obj("captionReview").rewrittenCaption)}</p>
              </div>
            )}
          </ReviewSection>

          {/* Trend alignment */}
          <Card className="p-5">
            <Eyebrow className="mb-2">Trend Alignment</Eyebrow>
            <div className="flex items-center gap-2">
              <Pill tone={obj("trendAlignment").aligned ? "win" : "risk"}>
                {obj("trendAlignment").aligned ? "Aligned" : "Not aligned"}
              </Pill>
              {str("trendAlignment", "trendName") && (
                <span className="text-[12px] text-claret">{str("trendAlignment", "trendName")} · {str("trendAlignment", "trendStatus")}</span>
              )}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-graphite">{str("trendAlignment", "explanation")}</p>
          </Card>

          {/* Competitor review */}
          <Card className="p-5">
            <Eyebrow className="mb-2">Competitor Review</Eyebrow>
            <div className="space-y-1.5 text-[12px] leading-relaxed">
              <div><span className="text-mist">Similar competitor content · </span><span className="text-ink">{str("competitorReview", "similarCompetitorContent")}</span></div>
              <div><span className="text-mist">What they did better · </span><span className="text-graphite">{str("competitorReview", "whatTheyDidBetter")}</span></div>
              <div><span className="text-mist">What they did differently · </span><span className="text-graphite">{str("competitorReview", "whatTheyDidDifferently")}</span></div>
              <div><span className="text-mist">Opportunity missed · </span><span className="text-claret">{str("competitorReview", "opportunityMissed")}</span></div>
            </div>
          </Card>

          {/* Similarity check + audience prediction */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <Eyebrow className="mb-2">Similarity Check</Eyebrow>
              <Pill tone={str("similarityCheck", "verdict") === "Very Unique" ? "win" : str("similarityCheck", "verdict") === "Highly Repetitive" ? "risk" : "accent"}>
                {str("similarityCheck", "verdict")}
              </Pill>
              <p className="mt-2 text-[12px] text-graphite">{str("similarityCheck", "explanation")}</p>
            </Card>
            <Card className="p-5">
              <Eyebrow className="mb-2">Audience Prediction</Eyebrow>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div><span className="text-mist">Likes · </span><span className="tabular text-ink">{str("audiencePrediction", "estimatedLikes")}</span></div>
                <div><span className="text-mist">Saves · </span><span className="tabular text-ink">{str("audiencePrediction", "estimatedSaves")}</span></div>
                <div><span className="text-mist">Shares · </span><span className="tabular text-ink">{str("audiencePrediction", "estimatedShares")}</span></div>
                <div><span className="text-mist">Comments · </span><span className="tabular text-ink">{str("audiencePrediction", "estimatedComments")}</span></div>
              </div>
              <div className="mt-2"><span className="text-mist text-[12px]">Reach potential · </span><Pill>{str("audiencePrediction", "reachPotential")}</Pill></div>
              <p className="mt-2 text-[12px] text-graphite">{str("audiencePrediction", "reasoning")}</p>
            </Card>
          </div>

          {/* Content improvements */}
          <Card className="p-5">
            <Eyebrow className="mb-3">Content Improvements</Eyebrow>
            <div className="grid gap-2 md:grid-cols-2">
              {(["betterHook", "betterFirstSlide", "betterThumbnail", "betterCarouselOrder", "betterCta", "betterLuxuryStorytelling", "betterCopy", "betterVisualSequence"] as const).map((k) => {
                const val = String(obj("contentImprovements")[k] ?? "");
                if (!val || val === "null") return null;
                return (
                  <div key={k} className="text-[12px]">
                    <span className="text-mist">{k.replace("better", "").replace(/([A-Z])/g, " $1").trim()} · </span>
                    <span className="text-ink">{val}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Alternative concepts */}
          {(arr("alternativeConcepts") as Record<string, unknown>[]).length > 0 && (
            <div>
              <Eyebrow className="mb-3">Alternative Concepts</Eyebrow>
              <div className="grid gap-4 md:grid-cols-3">
                {(arr("alternativeConcepts") as Record<string, unknown>[]).map((c, i) => (
                  <Card key={i} className="p-5">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="tabular text-[11px] text-mist">Alt #{i + 1}</span>
                    </div>
                    <p className="text-[13px] text-ink"><span className="text-mist">Hook · </span>{String(c.hook ?? "")}</p>
                    <p className="mt-1.5 text-[12px] text-graphite">{String(c.creativeConcept ?? "")}</p>
                    {String(c.caption ?? "") && (
                      <div className="mt-3 rounded-md border border-line bg-veil/40 p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="eyebrow text-mist">Caption</span>
                          <button
                            onClick={() => navigator.clipboard?.writeText(String(c.caption))}
                            className="eyebrow text-mist hover:text-claret"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink">{String(c.caption)}</p>
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-claret">{String(c.whyBetter ?? "")}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Cultural opportunity + best time */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <Eyebrow className="mb-2">Cultural Opportunity</Eyebrow>
              <p className="text-[13px] font-medium text-claret">{str("culturalOpportunity", "betterMoment")}</p>
              <p className="mt-1 text-[12px] text-graphite">{str("culturalOpportunity", "explanation")}</p>
            </Card>
            <Card className="p-5">
              <Eyebrow className="mb-2">Best Time to Publish</Eyebrow>
              <p className="text-[13px] font-medium text-ink">{str("bestTimeToPublish", "day")} · {str("bestTimeToPublish", "time")}</p>
              <p className="mt-1 text-[12px] text-graphite">{str("bestTimeToPublish", "reasoning")}</p>
            </Card>
          </div>

          {/* Final recommendation */}
          <Card className="border-l-[3px] border-l-ink p-6">
            <Eyebrow className="mb-3">Final Recommendation</Eyebrow>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="eyebrow text-positive">Strengths</span>
                <ul className="mt-1 space-y-1">
                  {(obj("finalRecommendation").strengths as string[] ?? []).map((s, i) => (
                    <li key={i} className="text-[12px] text-ink">· {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="eyebrow text-negative">Weaknesses</span>
                <ul className="mt-1 space-y-1">
                  {(obj("finalRecommendation").weaknesses as string[] ?? []).map((s, i) => (
                    <li key={i} className="text-[12px] text-ink">· {s}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 text-[12px]">
              <div><span className="text-mist">Biggest opportunity · </span><span className="text-claret">{str("finalRecommendation", "biggestOpportunity")}</span></div>
              <div><span className="text-mist">Biggest risk · </span><span className="text-negative">{str("finalRecommendation", "biggestRisk")}</span></div>
            </div>
            <p className="display mt-4 border-t border-hairline pt-4 text-[14px] leading-relaxed text-ink">
              {str("finalRecommendation", "finalVerdict")}
            </p>
          </Card>

          {/* Usage */}
          {displayResult?.usage && (
            <div className="border-t border-hairline pt-5">
              <Eyebrow className="mb-2">Review Usage</Eyebrow>
              <p className="tabular text-[11px] text-mist">
                {displayResult.model} · Input {displayResult.usage.inputTokens.toLocaleString()} · Output {displayResult.usage.outputTokens.toLocaleString()} · Total {displayResult.usage.totalTokens.toLocaleString()}
                {displayResult.usage.estimatedCostUsd != null && ` · Est. cost $${displayResult.usage.estimatedCostUsd.toFixed(4)}`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewSection({ title, score, children }: { title: string; score: number; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <Eyebrow>{title}</Eyebrow>
        {score > 0 && <span className={`tabular text-[16px] font-medium ${SCORE_COLOUR(score)}`}>{score}/100</span>}
      </div>
      {children}
    </Card>
  );
}
