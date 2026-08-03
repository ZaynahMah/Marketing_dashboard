"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Upload } from "@/components/Upload";
import { ExecutiveAudit } from "@/components/ExecutiveAudit";
import { PerformanceDashboard } from "@/components/PerformanceDashboard";
import { AiProvider } from "@/components/ai/AiProvider";
import { ReportDownloads, WeeklyReport, MonthlyReport } from "@/components/reports/ReportViews";
import { activeSnapshotStore, monthArchiveStore } from "@/lib/store";
import type { KpiSnapshot, UploadSnapshot } from "@/lib/store";
import type { AiReportType } from "@/lib/ai/types";
import { Eyebrow } from "@/components/ui";

type Layer = "executive" | "performance";

export default function Page() {
  const [active, setActive] = useState<UploadSnapshot | null>(null);
  const [archive, setArchive] = useState<KpiSnapshot[]>([]);
  const [layer, setLayer] = useState<Layer>("executive");
  const [reportType, setReportType] = useState<AiReportType>("daily");
  const [mode, setMode] = useState<"view" | "upload">("view");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([activeSnapshotStore.get(), monthArchiveStore.list()]).then(([snap, arch]) => {
      setActive(snap);
      setArchive(arch);
      if (!snap) setMode("upload");
      setLoaded(true);
    });
  }, []);

  async function refresh() {
    const [snap, arch] = await Promise.all([activeSnapshotStore.get(), monthArchiveStore.list()]);
    setActive(snap);
    setArchive(arch);
  }
  function onUploaded(snap: UploadSnapshot) {
    setActive(snap);
    refresh();
    setMode("view");
    setLayer("executive");
    setReportType("daily");
  }
  async function clearActive() {
    await activeSnapshotStore.clear();
    setActive(null);
    setMode("upload");
  }
  async function clearArchive() {
    if (!confirm("Clear the month archive? This removes the historical data used for Performance vs Previous Month.")) return;
    await monthArchiveStore.clear();
    setArchive([]);
  }

  if (!loaded) return <div className="p-12 text-[13px] text-mist">Loading workspace…</div>;

  const providerSnapId = active?.id ?? "none";
  const posts = active?.posts ?? [];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-shell items-center gap-4 px-6 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tcl-logo.svg" alt="Tata CLiQ Luxury" className="h-8 w-auto" />

          {mode === "view" && active && (
            <div className="ml-2 hidden items-center rounded-full border border-line bg-surface p-0.5 lg:flex">
              {(["daily", "weekly", "monthly"] as AiReportType[]).map((t) => (
                <Toggle key={t} label={t[0].toUpperCase() + t.slice(1)} on={reportType === t} onClick={() => setReportType(t)} />
              ))}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {active && (
              <span className="tabular hidden text-[11px] text-mist md:inline">
                {active.label} · {active.report.consolidated} posts
              </span>
            )}
            <button
              onClick={() => setMode("upload")}
              className="rounded-full bg-ink px-4 py-1.5 text-[12px] font-medium text-paper hover:opacity-90"
            >
              {active ? "Replace upload" : "Upload"}
            </button>
          </div>
        </div>

        {mode === "view" && active && (
          <div className="flex items-center gap-2 border-t border-hairline px-6 py-2">
            <div className="flex items-center gap-1 lg:hidden">
              {(["daily", "weekly", "monthly"] as AiReportType[]).map((t) => (
                <Toggle key={t} label={t[0].toUpperCase() + t.slice(1)} on={reportType === t} onClick={() => setReportType(t)} />
              ))}
            </div>
            {reportType === "daily" && (
              <div className="flex items-center gap-1">
                <Toggle label="Executive Audit" on={layer === "executive"} onClick={() => setLayer("executive")} />
                <Toggle label="Performance" on={layer === "performance"} onClick={() => setLayer("performance")} />
              </div>
            )}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-shell px-6 py-8">
        {mode === "upload" || !active ? (
          <div>
            {archive.length > 0 && (
              <div className="mx-auto mb-6 max-w-2xl rounded-card border border-hairline bg-veil/40 p-4">
                <Eyebrow>Archive · {archive.length} month{archive.length === 1 ? "" : "s"} of KPI history retained</Eyebrow>
                <p className="mt-1 text-[12px] leading-relaxed text-slate">
                  This is the only data preserved across uploads and is used solely for Performance vs Previous Month.
                  Uploading again will replace the active dataset but keep this archive.
                </p>
              </div>
            )}
            <Upload onDone={onUploaded} />
          </div>
        ) : (
          <AiProvider snapshotId={providerSnapId} posts={posts} prev={undefined} reportType={reportType}>
            <div className="mb-6">
              <ReportDownloads posts={posts} prev={undefined} />
            </div>
            {reportType === "weekly" ? (
              <WeeklyReport posts={posts} prev={undefined} />
            ) : reportType === "monthly" ? (
              <MonthlyReport posts={posts} />
            ) : layer === "executive" ? (
              <ExecutiveAudit posts={posts} label={active.label} archive={archive} />
            ) : (
              <PerformanceDashboard posts={posts} archive={archive} />
            )}
          </AiProvider>
        )}

        {mode === "view" && active && active.report.warnings.length > 0 && (
          <div className="mx-auto mt-10 max-w-2xl rounded-card border border-line bg-veil/50 p-4">
            <Eyebrow>Data notes</Eyebrow>
            <ul className="mt-2 space-y-1">
              {active.report.warnings.map((w, i) => (
                <li key={i} className="text-[12px] leading-relaxed text-slate">· {w}</li>
              ))}
            </ul>
          </div>
        )}

        {mode === "view" && (
          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
            <div>
              <Eyebrow>Data management</Eyebrow>
              <p className="mt-1 text-[11px] leading-relaxed text-slate">
                Every upload overwrites the previous dataset. The month archive holds only KPI totals per month for the MoM comparison.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={clearActive} className="rounded-full border border-line px-3 py-1 text-[11px] text-slate hover:border-negative hover:text-negative">
                Clear active dataset
              </button>
              <button onClick={clearArchive} className="rounded-full border border-line px-3 py-1 text-[11px] text-slate hover:border-negative hover:text-negative">
                Clear month archive
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-shell px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-6">
          <Eyebrow>Confidential · Internal use only · Tata CLiQ Luxury 2026</Eyebrow>
          <span className="eyebrow text-mist">Processed locally · your data stays in your browser</span>
        </div>
      </footer>
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`eyebrow whitespace-nowrap rounded-full px-3.5 py-1.5 transition-colors ${on ? "bg-ink text-paper" : "text-slate hover:text-ink"}`}
    >
      {label}
    </button>
  );
}
