"use client";
import React, { useMemo } from "react";
import { HBar } from "./Charts";
import { fmtCompact, fmtCost, fmtCurrency, fmtInt, fmtPct } from "@/lib/normalize";
import { bucketStats } from "@/lib/metrics";
import type { ConsolidatedPost } from "@/lib/schema";
import { Bar, Card, Eyebrow, Pill, SectionTitle } from "./ui";

export function PaidMedia({ posts }: { posts: ConsolidatedPost[] }) {
  const paid = useMemo(() => posts.filter((p) => p.hasPaid && (p.spend ?? 0) > 0), [posts]);

  const totals = useMemo(() => {
    const spend = sum(paid.map((p) => p.spend));
    const reach = sum(paid.map((p) => p.paidReach));
    const impr = sum(paid.map((p) => p.impressions));
    const thru = sum(paid.map((p) => p.thruplays));
    const eng = sum(paid.map((p) => p.paidEngagement));
    const clicks = sum(paid.map((p) => p.profileVisits));
    return {
      spend,
      reach,
      impr,
      thru,
      eng,
      clicks,
      cpr: reach ? spend / reach : null,
      cpv: thru ? spend / thru : null,
      cpe: eng ? spend / eng : null,
      ctr: impr ? (clicks / impr) * 100 : null,
      cpm: impr ? (spend / impr) * 1000 : null,
    };
  }, [paid]);

  // Budget allocation by bucket, sorted by efficiency (CPE).
  const alloc = useMemo(() => {
    const stats = bucketStats(posts).filter((b) => b.totalSpend > 0);
    const maxSpend = Math.max(1, ...stats.map((b) => b.totalSpend));
    return stats
      .map((b) => ({ ...b, maxSpend }))
      .sort((a, b) => (a.avgCpe ?? 9e9) - (b.avgCpe ?? 9e9));
  }, [posts]);

  // Spend vs paid reach scatter → as ranked efficiency bars (top 10 by spend).
  const topSpend = useMemo(
    () =>
      [...paid]
        .sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0))
        .slice(0, 8)
        .map((p) => ({
          name: (p.campaignName || p.description || p.shortcode).slice(0, 18),
          spend: p.spend ?? 0,
          reach: p.paidReach ?? 0,
        })),
    [paid]
  );

  if (!paid.length)
    return (
      <div>
        <SectionTitle eyebrow="Paid Media" title="Paid performance" />
        <p className="text-[13px] text-slate">No paid spend detected in this dataset.</p>
      </div>
    );

  const kpis = [
    ["Spend", fmtCurrency(totals.spend)],
    ["CPR", fmtCost(totals.cpr)],
    ["CPV", fmtCost(totals.cpv)],
    ["CPE", fmtCost(totals.cpe)],
    ["CTR", fmtPct(totals.ctr, 2)],
    ["CPM", fmtCost(totals.cpm)],
  ];

  return (
    <div>
      <SectionTitle
        eyebrow="Paid Media"
        title="Where the budget worked"
        hint="Cost efficiency across boosted posts, and where the next rupee should go."
      />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map(([k, v]) => (
          <div key={k} className="bg-surface p-4">
            <Eyebrow>{k}</Eyebrow>
            <div className="tabular mt-2 text-[19px] font-medium text-ink">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <Eyebrow className="mb-4">Spend vs paid reach · top campaigns</Eyebrow>
          <HBar data={topSpend} labelKey="name" valueKey="spend" unit="₹" height={260} />
        </Card>

        <Card className="p-5">
          <Eyebrow className="mb-1">Budget allocation guidance</Eyebrow>
          <p className="mb-4 text-[12px] text-slate">
            Ranked by cost per engagement. Fund the top; trim the bottom.
          </p>
          <div className="space-y-3">
            {alloc.map((b, i) => {
              const rec = i < Math.ceil(alloc.length / 2);
              return (
                <div key={b.bucket}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-ink">{b.bucket}</span>
                      <Pill tone={rec ? "win" : "risk"}>{rec ? "More budget" : "Less budget"}</Pill>
                    </div>
                    <span className="tabular text-[12px] text-slate">
                      {fmtCurrency(b.totalSpend)} · CPE {fmtCost(b.avgCpe)}
                    </span>
                  </div>
                  <Bar value={b.totalSpend} max={b.maxSpend} tone={rec ? "accent" : "ink"} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function sum(vals: (number | null)[]): number {
  return vals.reduce<number>((a, b) => a + (b ?? 0), 0);
}
