"use client";
import React, { useMemo, useState } from "react";
import { downloadWorkbook } from "@/lib/excel";
import { totalReach } from "@/lib/merge";
import { fmtCompact, fmtCost, fmtCurrency, fmtInt, fmtPct } from "@/lib/normalize";
import type { ConsolidatedPost } from "@/lib/schema";
import { Card, Eyebrow, Pill, SectionTitle } from "./ui";

type SortKey = "reach" | "views" | "saves" | "shares" | "comments" | "spend" | "cpe" | "er";
type FormatFilter = "All" | "Reel" | "Carousel" | "Static" | "Story";

const COLS: { key: SortKey; label: string; get: (p: ConsolidatedPost) => number | null; fmt: (v: number | null) => string; num?: boolean }[] = [
  { key: "reach", label: "Reach", get: (p) => totalReach(p), fmt: fmtCompact },
  { key: "views", label: "Views", get: (p) => p.views, fmt: fmtCompact },
  { key: "saves", label: "Saves", get: (p) => p.saves, fmt: fmtInt },
  { key: "shares", label: "Shares", get: (p) => p.shares, fmt: fmtInt },
  { key: "comments", label: "Comments", get: (p) => p.comments, fmt: fmtInt },
  { key: "er", label: "ER%", get: (p) => p.erByInteractions, fmt: (v) => fmtPct(v, 2) },
  { key: "spend", label: "Spend", get: (p) => p.spend, fmt: fmtCurrency },
  { key: "cpe", label: "CPE", get: (p) => p.cpe, fmt: fmtCost },
];

export function PostTable({ posts }: { posts: ConsolidatedPost[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("reach");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [fmt, setFmt] = useState<FormatFilter>("All");
  const [bucket, setBucket] = useState<string>("All");

  const buckets = useMemo(() => ["All", ...Array.from(new Set(posts.map((p) => p.contentBucket)))], [posts]);

  const rows = useMemo(() => {
    let r = posts.filter((p) => {
      if (fmt !== "All" && p.format !== fmt) return false;
      if (bucket !== "All" && p.contentBucket !== bucket) return false;
      if (q && !`${p.description} ${p.campaignName ?? ""} ${p.contentBucket}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
    const col = COLS.find((c) => c.key === sort)!;
    r = [...r].sort((a, b) => {
      const av = col.get(a) ?? -Infinity;
      const bv = col.get(b) ?? -Infinity;
      return dir === "desc" ? bv - av : av - bv;
    });
    return r;
  }, [posts, q, sort, dir, fmt, bucket]);

  function toggleSort(k: SortKey) {
    if (sort === k) setDir(dir === "desc" ? "asc" : "desc");
    else {
      setSort(k);
      setDir("desc");
    }
  }

  return (
    <div>
      <SectionTitle
        eyebrow="Post Performance"
        title="Every post, consolidated"
        hint="Columns mirror the downloadable Excel. Search, sort and filter, then export the exact master schema."
        right={
          <button
            onClick={() => downloadWorkbook(rows)}
            className="shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-[12px] font-medium text-ink hover:border-graphite"
          >
            Export {rows.length} rows ↓
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search descriptions, campaigns, buckets…"
          className="tabular w-full max-w-xs rounded-full border border-line bg-surface px-4 py-2 text-[13px] text-ink placeholder:text-mist focus:border-graphite"
        />
        <Select value={fmt} onChange={(v) => setFmt(v as FormatFilter)} options={["All", "Reel", "Carousel", "Static", "Story"]} />
        <Select value={bucket} onChange={setBucket} options={buckets} />
        <span className="tabular ml-auto text-[12px] text-mist">{rows.length} posts</span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-3 text-left">
                  <Eyebrow>Post</Eyebrow>
                </th>
                <th className="px-3 py-3">
                  <Eyebrow>Bucket</Eyebrow>
                </th>
                {COLS.map((c) => (
                  <th key={c.key} className="px-3 py-3 text-right">
                    <button
                      onClick={() => toggleSort(c.key)}
                      className={`eyebrow inline-flex items-center gap-1 hover:text-ink ${sort === c.key ? "text-ink" : ""}`}
                    >
                      {c.label}
                      {sort === c.key && <span aria-hidden>{dir === "desc" ? "↓" : "↑"}</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((p) => (
                <tr key={p.shortcode} className="border-b border-hairline last:border-0 hover:bg-veil/40">
                  <td className="max-w-[280px] px-4 py-3">
                    <a
                      href={p.postLink}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-1 text-[13px] text-ink hover:text-claret hover:underline"
                      title={p.description}
                    >
                      {p.description || p.shortcode}
                    </a>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="eyebrow text-mist">{p.format}</span>
                      {p.source !== "both" && <span className="eyebrow text-mist">· {p.source} only</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="eyebrow whitespace-nowrap text-graphite">{p.contentBucket}</span>
                  </td>
                  {COLS.map((c) => (
                    <td key={c.key} className="tabular px-3 py-3 text-right text-[13px] text-graphite">
                      {c.fmt(c.get(p))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 200 && (
          <div className="border-t border-hairline px-4 py-3 text-[12px] text-mist">
            Showing top 200 of {rows.length}. Export for the full set.
          </div>
        )}
      </Card>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="tabular rounded-full border border-line bg-surface px-4 py-2 text-[13px] text-ink focus:border-graphite"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
