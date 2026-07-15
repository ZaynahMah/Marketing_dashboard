"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Upload } from "@/components/Upload";
import { ExecutiveAudit } from "@/components/ExecutiveAudit";
import { PerformanceDashboard } from "@/components/PerformanceDashboard";
import { historyStore } from "@/lib/store";
import type { UploadSnapshot } from "@/lib/store";
import { Eyebrow } from "@/components/ui";

type Layer = "executive" | "performance";

export default function Page() {
  const [history, setHistory] = useState<UploadSnapshot[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [layer, setLayer] = useState<Layer>("executive");
  const [mode, setMode] = useState<"view" | "upload">("view");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    historyStore.list().then((h) => {
      setHistory(h);
      if (h.length) setActiveId(h[0].id);
      else setMode("upload");
      setLoaded(true);
    });
  }, []);

  const active = useMemo(() => history.find((h) => h.id === activeId) ?? null, [history, activeId]);
  const prev = useMemo(() => {
    if (!active) return undefined;
    const idx = history.findIndex((h) => h.id === active.id);
    return idx >= 0 && idx < history.length - 1 ? history[idx + 1].posts : undefined;
  }, [history, active]);

  async function refresh(selectId?: string) {
    const h = await historyStore.list();
    setHistory(h);
    setActiveId(selectId ?? h[0]?.id ?? null);
  }

  function onUploaded(snap: UploadSnapshot) {
    refresh(snap.id);
    setMode("view");
    setLayer("executive");
  }

  async function remove(id: string) {
    await historyStore.remove(id);
    const h = await historyStore.list();
    setHistory(h);
    setActiveId(h[0]?.id ?? null);
    if (!h.length) setMode("upload");
  }

  if (!loaded) return <div className="p-12 text-[13px] text-mist">Loading workspace…</div>;

  return (
    <div className="min-h-screen">
      {/* Global header */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-shell items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-ink text-[13px] text-ink display italic">
              L
            </span>
            <div className="leading-tight">
              <div className="text-[13px] font-medium text-ink">Tata CLiQ Luxury</div>
              <Eyebrow>Social Intelligence</Eyebrow>
            </div>
          </div>

          {mode === "view" && active && (
            <div className="ml-2 hidden items-center rounded-full border border-line bg-surface p-0.5 md:flex">
              <Toggle label="Executive Audit" on={layer === "executive"} onClick={() => setLayer("executive")} />
              <Toggle label="Performance" on={layer === "performance"} onClick={() => setLayer("performance")} />
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {history.length > 0 && (
              <select
                value={activeId ?? ""}
                onChange={(e) => {
                  setActiveId(e.target.value);
                  setMode("view");
                }}
                className="tabular max-w-[190px] rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] text-ink focus:border-graphite"
              >
                {history.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label} · {h.report.consolidated} posts
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setMode("upload")}
              className="rounded-full bg-ink px-4 py-1.5 text-[12px] font-medium text-paper hover:opacity-90"
            >
              New upload
            </button>
          </div>
        </div>

        {/* Mobile layer toggle */}
        {mode === "view" && active && (
          <div className="flex items-center gap-1 border-t border-hairline px-6 py-2 md:hidden">
            <Toggle label="Executive Audit" on={layer === "executive"} onClick={() => setLayer("executive")} />
            <Toggle label="Performance" on={layer === "performance"} onClick={() => setLayer("performance")} />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-shell px-6 py-8">
        {mode === "upload" || !active ? (
          <Upload onDone={onUploaded} />
        ) : layer === "executive" ? (
          <ExecutiveAudit posts={active.posts} label={active.label} />
        ) : (
          <PerformanceDashboard posts={active.posts} prev={prev} />
        )}

        {mode === "view" && active && active.report.warnings.length > 0 && (
          <div className="mx-auto mt-10 max-w-2xl rounded-card border border-line bg-veil/50 p-4">
            <Eyebrow>Data notes</Eyebrow>
            <ul className="mt-2 space-y-1">
              {active.report.warnings.map((w, i) => (
                <li key={i} className="text-[12px] leading-relaxed text-slate">
                  · {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {mode === "view" && history.length > 1 && (
          <div className="mx-auto mt-6 max-w-2xl">
            <Eyebrow className="mb-2">History</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {history.map((h) => (
                <span
                  key={h.id}
                  className={`tabular inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] ${
                    h.id === activeId ? "border-ink text-ink" : "border-line text-slate"
                  }`}
                >
                  {h.label}
                  <button onClick={() => remove(h.id)} className="text-mist hover:text-negative" title="Delete">
                    ✕
                  </button>
                </span>
              ))}
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
      className={`eyebrow rounded-full px-3.5 py-1.5 transition-colors ${on ? "bg-ink text-paper" : "text-slate hover:text-ink"}`}
    >
      {label}
    </button>
  );
}
