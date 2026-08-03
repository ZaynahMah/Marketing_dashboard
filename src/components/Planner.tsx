"use client";
import React, { useMemo, useState } from "react";
import { buildPlanner } from "@/lib/planner";
import { fmtCompact, fmtPct } from "@/lib/normalize";
import { computeTotals } from "@/lib/metrics";
import type { ConsolidatedPost } from "@/lib/schema";
import { Card, Eyebrow, Pill, SectionTitle } from "./ui";

export function Planner({ posts }: { posts: ConsolidatedPost[] }) {
  const entries = useMemo(() => buildPlanner(posts), [posts]);
  return (
    <div>
      <SectionTitle
        eyebrow="AI Content Planner · 30 Days"
        title="A month, composed"
        hint="Built from your performance and the Tata CLiQ Luxury content brief — business alignment first, then topical, then trend. ~3 posts a week: quality over quantity."
      />
      <div className="space-y-3">
        {entries.map((e) => (
          <Card key={e.day} className="p-5">
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-24 shrink-0">
                <Eyebrow>Day {e.day}</Eyebrow>
                <div className="tabular mt-1 text-[13px] text-ink">{e.postingDay}</div>
                <div className="tabular mt-0.5 text-[12px] text-slate">{e.bestTime}</div>
              </div>
              <div className="min-w-[240px] flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Pill tone="accent">{e.bucket}</Pill>
                  <Pill>{e.format}</Pill>
                  <span className="tabular ml-auto text-[12px] text-slate">Confidence {e.confidence}%</span>
                </div>
                <h3 className="display text-[16px] font-medium text-ink">{e.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-graphite">
                  <span className="text-mist">Hook · </span>
                  {e.hook}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-graphite">
                  <span className="text-mist">Caption · </span>
                  {e.captionDirection}
                </p>
                <div className="mt-2 grid gap-x-6 gap-y-1 text-[12px] text-slate sm:grid-cols-2">
                  <div>
                    <span className="text-mist">Reference · </span>
                    {e.referenceStyle}
                  </div>
                  <div>
                    <span className="text-mist">Objective · </span>
                    {e.objective}
                  </div>
                  <div>
                    <span className="text-mist">Expected KPI · </span>
                    {e.expectedKpi}
                  </div>
                </div>
                <p className="mt-2 text-[12px] italic leading-relaxed text-claret">{e.reason}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface Competitor {
  name: string;
  reach: string;
  er: string;
  posts: string;
}

export function CompetitorBenchmark({ posts }: { posts: ConsolidatedPost[] }) {
  const t = computeTotals(posts);
  const ourAvgReach = t.posts ? Math.round(t.reach / t.posts) : 0;
  const [rows, setRows] = useState<Competitor[]>([
    { name: "Ajio Luxe", reach: "", er: "", posts: "" },
    { name: "Nykaa Luxe", reach: "", er: "", posts: "" },
  ]);

  function update(i: number, key: keyof Competitor, v: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: v } : row)));
  }
  function add() {
    setRows((r) => [...r, { name: "", reach: "", er: "", posts: "" }]);
  }

  return (
    <div>
      <SectionTitle
        eyebrow="Competitor Benchmark"
        title="Us against the set"
        hint="Enter competitor figures manually (Sprinklr / Meltwater / manual pulls) to compare against our consolidated performance."
      />
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-3">
                <Eyebrow>Brand</Eyebrow>
              </th>
              <th className="px-3 py-3 text-right">
                <Eyebrow>Avg reach</Eyebrow>
              </th>
              <th className="px-3 py-3 text-right">
                <Eyebrow>ER %</Eyebrow>
              </th>
              <th className="px-3 py-3 text-right">
                <Eyebrow>Posts</Eyebrow>
              </th>
              <th className="px-3 py-3 text-right">
                <Eyebrow>vs us (reach)</Eyebrow>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-hairline bg-veil/40">
              <td className="px-4 py-3 text-[13px] font-medium text-claret">Tata CLiQ Luxury</td>
              <td className="tabular px-3 py-3 text-right text-[13px] text-ink">{fmtCompact(ourAvgReach)}</td>
              <td className="tabular px-3 py-3 text-right text-[13px] text-ink">{fmtPct(t.engagementRate)}</td>
              <td className="tabular px-3 py-3 text-right text-[13px] text-ink">{t.posts}</td>
              <td className="tabular px-3 py-3 text-right text-[13px] text-mist">—</td>
            </tr>
            {rows.map((row, i) => {
              const cr = parseFloat(row.reach.replace(/[^0-9.]/g, ""));
              const vs = Number.isFinite(cr) && ourAvgReach ? ((ourAvgReach - cr) / cr) * 100 : null;
              return (
                <tr key={i} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2">
                    <input
                      value={row.name}
                      onChange={(e) => update(i, "name", e.target.value)}
                      placeholder="Competitor"
                      className="w-full bg-transparent text-[13px] text-ink placeholder:text-mist focus:outline-none"
                    />
                  </td>
                  {(["reach", "er", "posts"] as const).map((k) => (
                    <td key={k} className="px-3 py-2 text-right">
                      <input
                        value={row[k]}
                        onChange={(e) => update(i, k, e.target.value)}
                        placeholder="—"
                        className="tabular w-20 bg-transparent text-right text-[13px] text-ink placeholder:text-mist focus:outline-none"
                      />
                    </td>
                  ))}
                  <td className="tabular px-3 py-2 text-right text-[13px]">
                    {vs === null ? (
                      <span className="text-mist">—</span>
                    ) : (
                      <span className={vs >= 0 ? "text-positive" : "text-negative"}>
                        {vs >= 0 ? "+" : ""}
                        {vs.toFixed(0)}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t border-hairline px-4 py-3">
          <button onClick={add} className="text-[12px] text-slate hover:text-claret">
            + Add competitor
          </button>
        </div>
      </Card>
    </div>
  );
}
