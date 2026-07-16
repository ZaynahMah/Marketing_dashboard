"use client";
import React from "react";

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: any;
}) {
  return (
    <Tag className={`rounded-card border border-line bg-surface shadow-card ${className}`}>{children}</Tag>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  hint,
  right,
}: {
  eyebrow?: string;
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h2 className="display text-[22px] font-medium leading-tight text-ink md:text-[26px]">{title}</h2>
        {hint && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null || !Number.isFinite(pct))
    return <span className="tabular text-[12px] text-mist">— vs prev</span>;
  const up = pct >= 0;
  return (
    <span
      className={`tabular inline-flex items-center gap-1 text-[12px] ${up ? "text-positive" : "text-negative"}`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "win" | "risk" | "muted" | "accent";
}) {
  const tones: Record<string, string> = {
    default: "bg-veil text-graphite border-line",
    win: "bg-[#EEF3EE] text-positive border-[#DCE7DC]",
    risk: "bg-[#F6EDEA] text-negative border-[#EBD9D2]",
    muted: "bg-transparent text-mist border-line",
    accent: "bg-[#F6EEF0] text-claret border-[#EBD9DE]",
  };
  return (
    <span
      className={`eyebrow inline-flex items-center rounded-full border px-2.5 py-1 ${tones[tone]}`}
      style={{ letterSpacing: "0.08em" }}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  delta?: number | null;
}) {
  return (
    <div className="p-5">
      <Eyebrow>{label}</Eyebrow>
      <div className="tabular mt-3 text-[26px] font-medium leading-none text-ink">{value}</div>
      <div className="mt-2 flex items-center gap-2">
        {delta !== undefined && <DeltaBadge pct={delta} />}
        {sub && <span className="text-[12px] text-slate">{sub}</span>}
      </div>
    </div>
  );
}

export function Divider() {
  return <div className="my-10 h-px w-full bg-hairline" />;
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-veil/40 p-8 text-center">
      <p className="display text-[16px] text-graphite">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[13px] text-slate">{body}</p>
    </div>
  );
}

export function Bar({ value, max, tone = "ink" }: { value: number; max: number; tone?: "ink" | "accent" }) {
  const w = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-veil">
      <div
        className="h-full rounded-full"
        style={{ width: `${w}%`, background: tone === "accent" ? "#6B2333" : "#4A4843" }}
      />
    </div>
  );
}
