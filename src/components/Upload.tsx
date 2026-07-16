"use client";
import React, { useRef, useState } from "react";
import { mergeFiles } from "@/lib/merge";
import type { MergeResult } from "@/lib/merge";
import { periodLabel } from "@/lib/metrics";
import { historyStore, newId } from "@/lib/store";
import type { UploadSnapshot } from "@/lib/store";
import { Card, Eyebrow, Pill } from "./ui";

function FileWell({
  label,
  hint,
  file,
  onPick,
}: {
  label: string;
  hint: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onPick(f);
      }}
      className={`group cursor-pointer rounded-card border p-6 transition-colors ${
        drag ? "border-claret bg-[#F6EEF0]" : file ? "border-line bg-veil/50" : "border-dashed border-line bg-surface hover:border-graphite"
      }`}
      onClick={() => ref.current?.click()}
    >
      <input
        ref={ref}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <div className="flex items-start justify-between">
        <Eyebrow>{label}</Eyebrow>
        {file ? <Pill tone="win">Ready</Pill> : <Pill tone="muted">CSV</Pill>}
      </div>
      {file ? (
        <div className="mt-3">
          <div className="tabular text-[14px] text-ink">{file.name}</div>
          <button
            className="mt-2 text-[12px] text-slate underline underline-offset-2 hover:text-claret"
            onClick={(e) => {
              e.stopPropagation();
              onPick(null);
            }}
          >
            Replace
          </button>
        </div>
      ) : (
        <p className="mt-3 text-[13px] leading-relaxed text-slate">{hint}</p>
      )}
    </div>
  );
}

export function Upload({ onDone }: { onDone: (snap: UploadSnapshot) => void }) {
  const [organic, setOrganic] = useState<File | null>(null);
  const [paid, setPaid] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<MergeResult | null>(null);

  async function run() {
    if (!organic && !paid) return;
    setBusy(true);
    setError(null);
    try {
      const result = await mergeFiles(organic ?? "", paid ?? "");
      setPreview(result);
      const snap: UploadSnapshot = {
        id: newId(),
        createdAt: new Date().toISOString(),
        label: periodLabel(result.posts),
        report: result.report,
        posts: result.posts,
        organicFileName: organic?.name,
        paidFileName: paid?.name,
      };
      await historyStore.save(snap);
      onDone(snap);
    } catch (e: any) {
      setError(e?.message || "Could not process these files. Check they are the raw CSV exports.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="fade-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tcl-logo.svg" alt="Tata CLiQ Luxury" className="h-10 w-auto" />
        <p className="mt-6 max-w-xl text-[14px] leading-relaxed text-slate">
          Drop the organic and paid Instagram exports. They're merged by post link into one consolidated
          dataset — with daily, weekly and monthly reports and brief-grounded strategy.
        </p>
      </div>

      <div className="mt-9 grid gap-4 md:grid-cols-2">
        <FileWell
          label="Organic · Meta Business Suite"
          hint="Daily Instagram export with reach, views, saves, shares, comments, follows and permalinks."
          file={organic}
          onPick={setOrganic}
        />
        <FileWell
          label="Paid · Campaign Export"
          hint="Spend, boosted reach, impressions, thruplays and campaign line items, keyed by post link."
          file={paid}
          onPick={setPaid}
        />
      </div>

      {error && (
        <div className="mt-5 rounded-card border border-[#EBD9D2] bg-[#F6EDEA] p-4 text-[13px] text-negative">
          {error}
        </div>
      )}

      <div className="mt-7 flex items-center gap-4">
        <button
          disabled={(!organic && !paid) || busy}
          onClick={run}
          className="rounded-full bg-ink px-6 py-3 text-[13px] font-medium text-paper transition-opacity disabled:opacity-30"
        >
          {busy ? "Merging…" : "Build consolidated report"}
        </button>
        <span className="text-[12px] text-mist">
          Processed in your browser. Nothing leaves this device.
        </span>
      </div>

      {preview && (
        <Card className="mt-8 p-5 fade-in">
          <Eyebrow className="mb-3">Merge complete</Eyebrow>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Consolidated posts", preview.report.consolidated],
              ["Matched (paid + organic)", preview.report.matched],
              ["Organic only", preview.report.organicOnly],
              ["Paid only", preview.report.paidOnly],
            ].map(([k, v]) => (
              <div key={k as string}>
                <div className="tabular text-[24px] font-medium text-ink">{v as number}</div>
                <div className="mt-1 text-[12px] text-slate">{k as string}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
