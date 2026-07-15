"use client";
import React, { useMemo, useState } from "react";
import { HBar, MultiLine, TrendArea, VBar, CHART_CLARET, CHART_INK } from "./Charts";
import { totalReach } from "@/lib/merge";
import { fmtCompact, fmtCurrency, fmtInt, fmtPct } from "@/lib/normalize";
import { bucketStats, computeTotals, delta, formatStats, scorePosts } from "@/lib/metrics";
import type { ConsolidatedPost } from "@/lib/schema";
import { Bar, Card, DeltaBadge, Empty, Eyebrow, Pill, SectionTitle } from "./ui";
import { PostTable } from "./PostTable";
import { PaidMedia } from "./PaidMedia";
import { CompetitorBenchmark } from "./Planner";
import { AiControls, AiUsageSection } from "./ai/AiControls";
import { AiContentStrategy, AiPlanner, AiWhatToPostNext } from "./ai/AiSections";

/* ------------------------------ KPI GRID ------------------------------ */
function KpiGrid({ posts, prev }: { posts: ConsolidatedPost[]; prev?: ConsolidatedPost[] }) {
  const t = computeTotals(posts);
  const p = prev ? computeTotals(prev) : null;

  const rows: { label: string; value: string; cur: number; prev: number | null }[] = [
    { label: "Reach", value: fmtCompact(t.reach), cur: t.reach, prev: p?.reach ?? null },
    { label: "Views", value: fmtCompact(t.views), cur: t.views, prev: p?.views ?? null },
    { label: "Engagement", value: fmtCompact(t.interactions), cur: t.interactions, prev: p?.interactions ?? null },
    { label: "Engagement Rate", value: fmtPct(t.engagementRate), cur: t.engagementRate ?? 0, prev: p?.engagementRate ?? null },
    { label: "Follows", value: fmtCompact(t.follows), cur: t.follows, prev: p?.follows ?? null },
    { label: "Profile Visits", value: fmtCompact(t.profileVisits), cur: t.profileVisits, prev: p?.profileVisits ?? null },
    { label: "Website Clicks", value: fmtCompact(t.profileVisits), cur: t.profileVisits, prev: p?.profileVisits ?? null },
    { label: "Saves", value: fmtCompact(t.saves), cur: t.saves, prev: p?.saves ?? null },
    { label: "Shares", value: fmtCompact(t.shares), cur: t.shares, prev: p?.shares ?? null },
    { label: "Comments", value: fmtCompact(t.comments), cur: t.comments, prev: p?.comments ?? null },
    { label: "Watch Time (thruplays)", value: fmtCompact(t.thruplays), cur: t.thruplays, prev: p?.thruplays ?? null },
    { label: "Impressions", value: fmtCompact(t.impressions), cur: t.impressions, prev: p?.impressions ?? null },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((r) => {
        const d = r.prev !== null ? delta(r.cur, r.prev).changePct : null;
        return (
          <div key={r.label} className="bg-surface p-4">
            <Eyebrow>{r.label}</Eyebrow>
            <div className="tabular mt-2.5 text-[22px] font-medium leading-none text-ink">{r.value}</div>
            <div className="mt-2">{prev ? <DeltaBadge pct={d} /> : <span className="eyebrow text-mist">this period</span>}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ TRENDS ------------------------------ */
function weeklySeries(posts: ConsolidatedPost[]) {
  const byWeek = new Map<string, { reach: number; views: number; eng: number; spend: number; follows: number }>();
  for (const p of posts) {
    if (!p.publishTime) continue;
    const d = new Date(p.publishTime);
    if (isNaN(d.getTime())) continue;
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
    const key = `W${String(week).padStart(2, "0")}`;
    const cur = byWeek.get(key) ?? { reach: 0, views: 0, eng: 0, spend: 0, follows: 0 };
    cur.reach += totalReach(p) ?? 0;
    cur.views += p.views ?? 0;
    cur.eng += p.interactions ?? 0;
    cur.spend += p.spend ?? 0;
    cur.follows += p.follows ?? 0;
    byWeek.set(key, cur);
  }
  return Array.from(byWeek.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, v]) => ({ week, ...v }));
}

function Trends({ posts }: { posts: ConsolidatedPost[] }) {
  const series = useMemo(() => weeklySeries(posts), [posts]);
  const [metric, setMetric] = useState<"reach" | "views" | "eng" | "spend" | "follows">("reach");
  const labels: Record<string, string> = { reach: "Reach", views: "Views", eng: "Engagement", spend: "Spend", follows: "Followers" };

  if (series.length < 2)
    return (
      <Empty
        title="Trends need more than one week of posts"
        body="Once the dataset spans multiple weeks, week-over-week and month-over-month curves appear here."
      />
    );

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Week over week</Eyebrow>
        <div className="flex flex-wrap gap-1">
          {(["reach", "views", "eng", "spend", "follows"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`eyebrow rounded-full border px-3 py-1 transition-colors ${
                metric === m ? "border-ink bg-ink text-paper" : "border-line text-slate hover:border-graphite"
              }`}
            >
              {labels[m]}
            </button>
          ))}
        </div>
      </div>
      <TrendArea data={series} xKey="week" yKey={metric} color={metric === "spend" ? CHART_CLARET : CHART_INK} height={240} />
    </Card>
  );
}

/* ------------------------------ CONTENT ANALYSIS ------------------------------ */
function ContentAnalysis({ posts }: { posts: ConsolidatedPost[] }) {
  const stats = useMemo(() => bucketStats(posts).filter((b) => b.posts >= 1), [posts]);
  const best = stats[0];
  const worst = [...stats].filter((s) => s.posts >= 2).sort((a, b) => a.avgSaves - b.avgSaves)[0];
  const chart = stats.map((s) => ({ name: s.bucket, value: s.avgSaves }));

  return (
    <div>
      <SectionTitle
        eyebrow="Content Analysis"
        title="Which stories earn depth"
        hint="Posts auto-classified into Tata CLiQ Luxury content buckets, ranked by the saves-and-shares depth we privilege over raw reach."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <Eyebrow className="mb-4">Average saves by bucket</Eyebrow>
          <HBar data={chart} labelKey="name" valueKey="value" height={Math.max(200, chart.length * 30)} accentIndex={0} />
        </Card>
        <div className="space-y-4">
          {best && (
            <Card className="border-l-[3px] border-l-positive p-5">
              <Pill tone="win">Best bucket</Pill>
              <h3 className="display mt-2 text-[18px] font-medium text-ink">{best.bucket}</h3>
              <p className="mt-1 text-[13px] text-graphite">
                {fmtInt(best.avgSaves)} avg saves · {fmtCompact(best.avgReach)} avg reach · {fmtInt(best.avgShares)} avg shares across {best.posts} posts.
              </p>
            </Card>
          )}
          {worst && (
            <Card className="border-l-[3px] border-l-negative p-5">
              <Pill tone="risk">Weakest bucket</Pill>
              <h3 className="display mt-2 text-[18px] font-medium text-ink">{worst.bucket}</h3>
              <p className="mt-1 text-[13px] text-graphite">
                Only {fmtInt(worst.avgSaves)} avg saves across {worst.posts} posts — trim or re-angle in the maison register.
              </p>
            </Card>
          )}
          <Card className="p-4">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2"><Eyebrow>Bucket</Eyebrow></th>
                  <th className="py-2 text-right"><Eyebrow>Posts</Eyebrow></th>
                  <th className="py-2 text-right"><Eyebrow>Saves</Eyebrow></th>
                  <th className="py-2 text-right"><Eyebrow>Reach</Eyebrow></th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.bucket} className="border-b border-hairline last:border-0">
                    <td className="py-2 text-ink">{s.bucket}</td>
                    <td className="tabular py-2 text-right text-graphite">{s.posts}</td>
                    <td className="tabular py-2 text-right text-graphite">{fmtInt(s.avgSaves)}</td>
                    <td className="tabular py-2 text-right text-graphite">{fmtCompact(s.avgReach)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ FORMAT ANALYSIS ------------------------------ */
function FormatAnalysis({ posts }: { posts: ConsolidatedPost[] }) {
  const stats = useMemo(() => formatStats(posts).filter((f) => f.format !== "Unknown"), [posts]);
  const metrics: { key: keyof (typeof stats)[number]; label: string }[] = [
    { key: "avgReach", label: "Reach" },
    { key: "avgViews", label: "Views" },
    { key: "avgEngagement", label: "Engagement" },
    { key: "avgShares", label: "Shares" },
    { key: "avgComments", label: "Comments" },
    { key: "avgSaves", label: "Saves" },
  ];
  return (
    <div>
      <SectionTitle eyebrow="Format Analysis" title="Reels, carousels, static — compared" />
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="px-4 py-3"><Eyebrow>Format</Eyebrow></th>
              <th className="px-3 py-3 text-right"><Eyebrow>Posts</Eyebrow></th>
              {metrics.map((m) => (
                <th key={m.key as string} className="px-3 py-3 text-right"><Eyebrow>{m.label}</Eyebrow></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((f) => (
              <tr key={f.format} className="border-b border-hairline last:border-0">
                <td className="px-4 py-3 text-[13px] font-medium text-ink">{f.format}</td>
                <td className="tabular px-3 py-3 text-right text-[13px] text-graphite">{f.posts}</td>
                {metrics.map((m) => (
                  <td key={m.key as string} className="tabular px-3 py-3 text-right text-[13px] text-graphite">
                    {fmtCompact(f[m.key] as number)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ------------------------------ TOP / BOTTOM ------------------------------ */
function reasonsTop(p: ConsolidatedPost): string[] {
  const r: string[] = [];
  if ((p.saves ?? 0) > 0) r.push(`${fmtInt(p.saves)} saves — high keep-intent`);
  if ((p.shares ?? 0) > 0) r.push(`${fmtInt(p.shares)} shares — strong shareability`);
  if ((p.erByInteractions ?? 0) >= 1) r.push(`${fmtPct(p.erByInteractions, 2)} engagement rate`);
  if ((p.views ?? 0) > 0) r.push(`${fmtCompact(p.views)} views`);
  if (p.format === "Reel") r.push("Cinematic Reel — our favoured format");
  return r.slice(0, 4);
}
function reasonsBottom(p: ConsolidatedPost, medianReach: number, medianSaves: number): string[] {
  const r: string[] = [];
  if ((totalReach(p) ?? 0) < medianReach * 0.5) r.push("Reach below half the median — weak hook / distribution");
  if ((p.saves ?? 0) < medianSaves * 0.4) r.push("Low saves — limited keep-intent");
  if ((p.shares ?? 0) === 0) r.push("Zero shares — low shareability");
  if ((p.erByInteractions ?? 0) < 0.5) r.push("Sub-0.5% engagement rate — soft CTA");
  if (p.vtr !== null && p.vtr < 15) r.push(`${fmtPct(p.vtr)} VTR — high skip / short watch time`);
  if (!r.length) r.push("Middling on every axis — did not earn its place on the feed");
  return r.slice(0, 4);
}

function TopBottom({ posts }: { posts: ConsolidatedPost[] }) {
  const scored = useMemo(() => scorePosts(posts), [posts]);
  const top = scored.slice(0, 3);
  const bottom = [...scored].reverse().slice(0, 3);
  const reaches = posts.map((p) => totalReach(p) ?? 0).sort((a, b) => a - b);
  const saves = posts.map((p) => p.saves ?? 0).sort((a, b) => a - b);
  const medReach = reaches[Math.floor(reaches.length / 2)] ?? 0;
  const medSaves = saves[Math.floor(saves.length / 2)] ?? 0;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <SectionTitle eyebrow="Top Performers" title="What worked — and why" />
        <div className="space-y-3">
          {top.map((s) => (
            <PostCard key={s.post.shortcode} p={s.post} score={s.score} reasons={reasonsTop(s.post)} tone="win" />
          ))}
        </div>
      </div>
      <div>
        <SectionTitle eyebrow="Lowest Performers" title="What underdelivered — and why" />
        <div className="space-y-3">
          {bottom.map((s) => (
            <PostCard
              key={s.post.shortcode}
              p={s.post}
              score={s.score}
              reasons={reasonsBottom(s.post, medReach, medSaves)}
              tone="risk"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PostCard({
  p,
  score,
  reasons,
  tone,
}: {
  p: ConsolidatedPost;
  score: number;
  reasons: string[];
  tone: "win" | "risk";
}) {
  return (
    <Card className={`p-4 ${tone === "win" ? "border-l-[3px] border-l-positive" : "border-l-[3px] border-l-negative"}`}>
      <div className="flex items-start justify-between gap-3">
        <a
          href={p.postLink}
          target="_blank"
          rel="noreferrer"
          className="line-clamp-2 flex-1 text-[13px] font-medium text-ink hover:text-claret hover:underline"
        >
          {p.description || p.shortcode}
        </a>
        <span className="tabular shrink-0 text-[12px] text-slate">{score.toFixed(0)}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="eyebrow text-mist">{p.format}</span>
        <span className="eyebrow text-mist">· {p.contentBucket}</span>
      </div>
      <ul className="mt-3 space-y-1">
        {reasons.map((r, i) => (
          <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-graphite">
            <span className={tone === "win" ? "text-positive" : "text-negative"}>·</span>
            {r}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------ AUDIENCE BEHAVIOUR ------------------------------ */
function AudienceBehaviour({ posts }: { posts: ConsolidatedPost[] }) {
  const stats = bucketStats(posts).filter((b) => b.posts >= 1);
  const top = (key: "avgSaves" | "avgShares" | "avgEngagement") =>
    [...stats].sort((a, b) => (b[key] as number) - (a[key] as number))[0];

  const byComments = [...posts].filter((p) => (p.comments ?? 0) > 0).sort((a, b) => (b.comments ?? 0) - (a.comments ?? 0))[0];
  const byFollows = [...posts].filter((p) => (p.follows ?? 0) > 0).sort((a, b) => (b.follows ?? 0) - (a.follows ?? 0))[0];
  const byVisits = [...posts].filter((p) => (p.profileVisits ?? 0) > 0).sort((a, b) => (b.profileVisits ?? 0) - (a.profileVisits ?? 0))[0];

  const saveB = top("avgSaves");
  const shareB = top("avgShares");

  const cards = [
    saveB && { k: "What people save", v: `${saveB.bucket} content`, d: `${fmtInt(saveB.avgSaves)} avg saves per post — highest keep-intent.` },
    shareB && { k: "What people share", v: `${shareB.bucket} content`, d: `${fmtInt(shareB.avgShares)} avg shares per post — most shareable register.` },
    byComments && {
      k: "What earns comments",
      v: byComments.contentBucket,
      d: `"${(byComments.description || byComments.shortcode).slice(0, 40)}…" drew ${fmtInt(byComments.comments)} comments.`,
    },
    byFollows && {
      k: "What earns follows",
      v: byFollows.contentBucket,
      d: `A ${byFollows.format} drove ${fmtInt(byFollows.follows)} follows — strongest acquisition post.`,
    },
    byVisits && {
      k: "What drives profile visits",
      v: byVisits.contentBucket,
      d: `${fmtInt(byVisits.profileVisits)} profile visits — top consideration driver.`,
    },
  ].filter(Boolean) as { k: string; v: string; d: string }[];

  return (
    <div>
      <SectionTitle eyebrow="Audience Behaviour" title="How the audience responds" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.k} className="p-5">
            <Eyebrow>{c.k}</Eyebrow>
            <div className="display mt-2 text-[16px] font-medium text-ink">{c.v}</div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate">{c.d}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ ORCHESTRATOR ------------------------------ */
const SECTIONS = [
  "KPIs",
  "Trends",
  "Content",
  "Format",
  "Paid",
  "Rankings",
  "Audience",
  "Posts",
  "Planner",
  "Competitors",
] as const;
type Section = (typeof SECTIONS)[number];

export function PerformanceDashboard({ posts, prev }: { posts: ConsolidatedPost[]; prev?: ConsolidatedPost[] }) {
  const [active, setActive] = useState<Section>("KPIs");
  return (
    <div className="fade-in">
      <nav className="sticky top-[57px] z-10 -mx-6 mb-8 border-b border-hairline bg-paper/85 px-6 py-3 backdrop-blur">
        <div className="flex gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`eyebrow whitespace-nowrap rounded-full px-3.5 py-1.5 transition-colors ${
                active === s ? "bg-ink text-paper" : "text-slate hover:bg-veil"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </nav>

      <div className="mb-6">
        <AiControls />
      </div>

      {active === "KPIs" && (
        <section>
          <SectionTitle
            eyebrow="KPI Dashboard"
            title="The full board"
            hint={prev ? "Change shown vs the previous upload." : "Upload a second period to unlock period-over-period change."}
          />
          <KpiGrid posts={posts} prev={prev} />
        </section>
      )}
      {active === "Trends" && (
        <section>
          <SectionTitle eyebrow="Monthly Trends" title="Momentum over time" />
          <Trends posts={posts} />
        </section>
      )}
      {active === "Content" && <ContentAnalysis posts={posts} />}
      {active === "Format" && <FormatAnalysis posts={posts} />}
      {active === "Paid" && <PaidMedia posts={posts} />}
      {active === "Rankings" && <TopBottom posts={posts} />}
      {active === "Audience" && <AudienceBehaviour posts={posts} />}
      {active === "Posts" && <PostTable posts={posts} />}
      {active === "Planner" && (
        <div>
          <AiContentStrategy />
          <AiWhatToPostNext />
          <AiPlanner posts={posts} />
        </div>
      )}
      {active === "Competitors" && <CompetitorBenchmark posts={posts} />}

      <AiUsageSection />
    </div>
  );
}
