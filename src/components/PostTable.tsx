"use client";
import React, { useMemo, useState } from "react";
import { downloadWorkbook } from "@/lib/excel";
import { totalReach } from "@/lib/merge";
import { fmtCompact, fmtCost, fmtInt, fmtPct } from "@/lib/normalize";
import type { ConsolidatedPost, ContentBucket, PostFormat } from "@/lib/schema";
import { CONTENT_BUCKETS } from "@/lib/schema";
import { Card, Eyebrow, SectionTitle } from "./ui";

/** Every column in the consolidated schema. Table mirrors the downloadable Excel. */
type Col = {
  key: string;
  label: string;
  align?: "left" | "right";
  extract: (p: ConsolidatedPost) => string | number | null;
  sortValue?: (p: ConsolidatedPost) => number;
};

const COLS: Col[] = [
  { key: "publishTime", label: "Date", extract: (p) => (p.publishTime ? new Date(p.publishTime).toISOString().slice(0, 10) : "—"), sortValue: (p) => (p.publishTime ? new Date(p.publishTime).getTime() : 0) },
  { key: "description", label: "Post", extract: (p) => p.description || p.shortcode },
  { key: "format", label: "Format", extract: (p) => p.format },
  { key: "bucket", label: "Bucket", extract: (p) => p.contentBucket },
  { key: "objective", label: "Objective", extract: (p) => p.objective || "—" },
  { key: "campaign", label: "Campaign", extract: (p) => p.campaignName || "—" },
  { key: "reach", label: "Reach (T)", align: "right", extract: (p) => totalReach(p), sortValue: (p) => totalReach(p) ?? 0 },
  { key: "organicReach", label: "Organic Reach", align: "right", extract: (p) => p.reach, sortValue: (p) => p.reach ?? 0 },
  { key: "paidReach", label: "Paid Reach", align: "right", extract: (p) => p.paidReach, sortValue: (p) => p.paidReach ?? 0 },
  { key: "views", label: "Views", align: "right", extract: (p) => p.views, sortValue: (p) => p.views ?? 0 },
  { key: "thruplays", label: "Thruplays", align: "right", extract: (p) => p.thruplays, sortValue: (p) => p.thruplays ?? 0 },
  { key: "impressions", label: "Impressions", align: "right", extract: (p) => p.impressions, sortValue: (p) => p.impressions ?? 0 },
  { key: "likes", label: "Likes", align: "right", extract: (p) => p.likes, sortValue: (p) => p.likes ?? 0 },
  { key: "saves", label: "Saves", align: "right", extract: (p) => p.saves, sortValue: (p) => p.saves ?? 0 },
  { key: "shares", label: "Shares", align: "right", extract: (p) => p.shares, sortValue: (p) => p.shares ?? 0 },
  { key: "comments", label: "Comments", align: "right", extract: (p) => p.comments, sortValue: (p) => p.comments ?? 0 },
  { key: "interactions", label: "Interactions", align: "right", extract: (p) => p.interactions, sortValue: (p) => p.interactions ?? 0 },
  { key: "engaged", label: "Accts Engaged", align: "right", extract: (p) => p.accountsEngaged, sortValue: (p) => p.accountsEngaged ?? 0 },
  { key: "profileVisits", label: "Profile Visits", align: "right", extract: (p) => p.profileVisits, sortValue: (p) => p.profileVisits ?? 0 },
  { key: "follows", label: "Follows", align: "right", extract: (p) => p.follows, sortValue: (p) => p.follows ?? 0 },
  { key: "er", label: "ER%", align: "right", extract: (p) => p.erByInteractions, sortValue: (p) => p.erByInteractions ?? 0 },
  { key: "vtr", label: "VTR%", align: "right", extract: (p) => p.vtr, sortValue: (p) => p.vtr ?? 0 },
  { key: "spend", label: "Spend", align: "right", extract: (p) => p.spend, sortValue: (p) => p.spend ?? 0 },
  { key: "cpe", label: "CPE", align: "right", extract: (p) => p.cpe, sortValue: (p) => p.cpe ?? 0 },
  { key: "cpr", label: "CPR", align: "right", extract: (p) => p.cpr, sortValue: (p) => p.cpr ?? 0 },
  { key: "cpv", label: "CPV", align: "right", extract: (p) => p.cpv, sortValue: (p) => p.cpv ?? 0 },
  { key: "ctr", label: "CTR", align: "right", extract: (p) => p.ctr, sortValue: (p) => p.ctr ?? 0 },
  { key: "cpm", label: "CPM", align: "right", extract: (p) => p.cpm, sortValue: (p) => p.cpm ?? 0 },
  { key: "duration", label: "Duration", align: "right", extract: (p) => (p.durationSec != null ? `${p.durationSec}s` : "—"), sortValue: (p) => p.durationSec ?? 0 },
  { key: "source", label: "Source", extract: (p) => p.source },
];

const FORMATTERS: Record<string, (v: any) => string> = {
  reach: fmtCompact, organicReach: fmtCompact, paidReach: fmtCompact,
  views: fmtCompact, thruplays: fmtCompact, impressions: fmtCompact,
  likes: fmtInt, saves: fmtInt, shares: fmtInt, comments: fmtInt,
  interactions: fmtCompact, engaged: fmtCompact, profileVisits: fmtInt, follows: fmtInt,
  er: (v: number) => fmtPct(v, 2), vtr: (v: number) => fmtPct(v, 1), ctr: (v: number) => fmtPct(v, 2),
  spend: (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`,
  cpe: fmtCost, cpr: fmtCost, cpv: fmtCost, cpm: fmtCost,
};

function cellText(col: Col, p: ConsolidatedPost): string {
  const v = col.extract(p);
  if (v == null || v === "") return "—";
  const f = FORMATTERS[col.key];
  if (f && typeof v === "number") return f(v);
  return String(v);
}

export function PostTable({ posts }: { posts: ConsolidatedPost[] }) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string>("reach");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [fmt, setFmt] = useState<PostFormat | "All">("All");
  const [bucket, setBucket] = useState<ContentBucket | "All">("All");

  const rows = useMemo(() => {
    let r = posts;
    if (q) {
      const needle = q.toLowerCase();
      r = r.filter((p) => `${p.description} ${p.shortcode} ${p.campaignName ?? ""}`.toLowerCase().includes(needle));
    }
    if (fmt !== "All") r = r.filter((p) => p.format === fmt);
    if (bucket !== "All") r = r.filter((p) => p.contentBucket === bucket);
    const col = COLS.find((c) => c.key === sortKey);
    if (col?.sortValue) {
      const sv = col.sortValue;
      r = [...r].sort((a, b) => (dir === "desc" ? sv(b) - sv(a) : sv(a) - sv(b)));
    }
    return r;
  }, [posts, q, sortKey, dir, fmt, bucket]);

  function toggleSort(k: string) {
    if (sortKey === k) setDir(dir === "desc" ? "asc" : "desc");
    else {
      setSortKey(k);
      setDir("desc");
    }
  }

  return (
    <div>
      <SectionTitle
        eyebrow={`Post Performance · ${rows.length} of ${posts.length}`}
        title="Every field from the consolidated sheet"
        hint="Scroll horizontally — every column mirrors the downloadable Excel schema."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search description or campaign…"
          className="flex-1 min-w-[220px] rounded-full border border-line bg-surface px-4 py-1.5 text-[13px] text-ink placeholder:text-mist focus:border-graphite focus:outline-none"
        />
        <select value={fmt} onChange={(e) => setFmt(e.target.value as PostFormat | "All")} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] text-ink focus:border-graphite">
          <option value="All">All formats</option>
          {["Reel", "Carousel", "Static", "Story", "Video"].map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={bucket} onChange={(e) => setBucket(e.target.value as ContentBucket | "All")} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] text-ink focus:border-graphite">
          <option value="All">All buckets</option>
          {CONTENT_BUCKETS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <button
          onClick={() => downloadWorkbook(posts, "post_table")}
          className="rounded-full bg-ink px-4 py-1.5 text-[12px] font-medium text-paper hover:opacity-90"
        >
          Export Excel
        </button>
      </div>

      <Card className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-line">
              {COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => c.sortValue && toggleSort(c.key)}
                  className={`whitespace-nowrap px-3 py-2.5 ${c.align === "right" ? "text-right" : "text-left"} ${c.sortValue ? "cursor-pointer hover:text-claret" : ""}`}
                >
                  <Eyebrow>
                    {c.label}
                    {sortKey === c.key && <span className="ml-1">{dir === "desc" ? "↓" : "↑"}</span>}
                  </Eyebrow>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 300).map((p, i) => (
              <tr key={p.shortcode + i} className="border-b border-hairline last:border-0">
                {COLS.map((c) => {
                  const isLink = c.key === "description";
                  const txt = cellText(c, p);
                  if (isLink) {
                    return (
                      <td key={c.key} className="min-w-[280px] max-w-[380px] px-3 py-2 text-[12px]">
                        <a href={p.postLink} target="_blank" rel="noreferrer" className="line-clamp-2 text-ink hover:text-claret hover:underline">
                          {txt}
                        </a>
                      </td>
                    );
                  }
                  return (
                    <td key={c.key} className={`whitespace-nowrap px-3 py-2 text-[12px] ${c.align === "right" ? "tabular text-right text-graphite" : "text-graphite"}`}>
                      {txt}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {rows.length > 300 && <p className="mt-2 text-[11px] text-mist">Showing 300 of {rows.length} — refine filters or export for the full dataset.</p>}
    </div>
  );
}
