"use client";
import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtCompact } from "@/lib/normalize";

const INK = "#1A1917";
const CLARET = "#6B2333";
const LINE = "#EFEDE7";
const MIST = "#9C988E";

const axisProps = {
  tick: { fontSize: 11, fill: MIST, fontFamily: "var(--font-mono)" },
  tickLine: false,
  axisLine: { stroke: LINE },
} as const;

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-lift">
      <div className="text-[12px]">{children}</div>
    </div>
  );
}

function CompactTip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <Box>
      <div className="eyebrow mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="tabular flex items-center gap-2 text-ink">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color || INK }} />
          {p.name}: {unit === "₹" ? "₹" : ""}
          {typeof p.value === "number" ? fmtCompact(p.value) : p.value}
        </div>
      ))}
    </Box>
  );
}

export function TrendArea({
  data,
  xKey,
  yKey,
  color = INK,
  height = 200,
}: {
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.14} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={LINE} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={44} tickFormatter={(v) => fmtCompact(v)} />
        <Tooltip content={<CompactTip />} />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={1.75} fill={`url(#g-${yKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiLine({
  data,
  xKey,
  series,
  height = 240,
}: {
  data: any[];
  xKey: string;
  series: { key: string; name: string; color: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={LINE} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={44} tickFormatter={(v) => fmtCompact(v)} />
        <Tooltip content={<CompactTip />} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={1.75}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HBar({
  data,
  labelKey,
  valueKey,
  unit,
  height = 260,
  accentIndex = -1,
}: {
  data: any[];
  labelKey: string;
  valueKey: string;
  unit?: string;
  height?: number;
  accentIndex?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={LINE} horizontal={false} />
        <XAxis type="number" {...axisProps} tickFormatter={(v) => fmtCompact(v)} />
        <YAxis type="category" dataKey={labelKey} {...axisProps} width={104} />
        <Tooltip content={<CompactTip unit={unit} />} cursor={{ fill: "#F3F1EC" }} />
        <Bar dataKey={valueKey} radius={[0, 3, 3, 0]} barSize={16}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === accentIndex ? CLARET : INK} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VBar({
  data,
  labelKey,
  valueKey,
  unit,
  height = 240,
}: {
  data: any[];
  labelKey: string;
  valueKey: string;
  unit?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={LINE} vertical={false} />
        <XAxis dataKey={labelKey} {...axisProps} />
        <YAxis {...axisProps} width={44} tickFormatter={(v) => fmtCompact(v)} />
        <Tooltip content={<CompactTip unit={unit} />} cursor={{ fill: "#F3F1EC" }} />
        <Bar dataKey={valueKey} radius={[3, 3, 0, 0]} barSize={30} fill={INK} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export const CHART_INK = INK;
export const CHART_CLARET = CLARET;
