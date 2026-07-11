"use client";

import { useId, useMemo } from "react";

export type AnalyticsPoint = { label: string; value: number };

const colors = ["#38bdf8", "#8b5cf6", "#10b981", "#f59e0b", "#fb7185", "#06b6d4"];

export function TrendChart({ data, emptyLabel, ariaLabel }: { data: AnalyticsPoint[]; emptyLabel: string; ariaLabel: string }) {
  const gradientId = useId().replace(/:/g, "");
  const { line, area, max } = useMemo(() => {
    const peak = Math.max(1, ...data.map((item) => item.value));
    const points = data.map((item, index) => {
      const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
      const y = 92 - (item.value / peak) * 78;
      return `${x},${y}`;
    });
    return { line: points.join(" "), area: `0,100 ${points.join(" ")} 100,100`, max: peak };
  }, [data]);

  if (!data.some((item) => item.value > 0)) return <EmptyChart label={emptyLabel} />;
  return (
    <div className="analytics-chart" role="img" aria-label={ariaLabel}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-56 w-full" direction="ltr">
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#38bdf8" stopOpacity=".38"/><stop offset="1" stopColor="#38bdf8" stopOpacity="0"/></linearGradient></defs>
        {[25, 50, 75].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="analytics-grid-line" vectorEffect="non-scaling-stroke" />)}
        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline points={line} fill="none" stroke="#38bdf8" strokeWidth="2.3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-3 flex justify-between gap-2 text-[11px] font-bold text-[var(--analytics-muted)]">
        <span>{data[0]?.label}</span><span>{max.toLocaleString()}</span><span>{data.at(-1)?.label}</span>
      </div>
    </div>
  );
}

export function RankingBars({ data, emptyLabel }: { data: AnalyticsPoint[]; emptyLabel: string }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  if (!data.some((item) => item.value > 0)) return <EmptyChart label={emptyLabel} />;
  return <div className="space-y-4">{data.map((item, index) => <div key={`${item.label}-${index}`}>
    <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate font-bold text-[var(--analytics-text)]">{item.label}</span><strong className="shrink-0 tabular-nums text-[var(--analytics-text)]">{item.value.toLocaleString()}</strong></div>
    <div className="h-2.5 overflow-hidden rounded-full bg-[var(--analytics-track)]" dir="ltr"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(item.value / max) * 100}%`, background: colors[index % colors.length] }} /></div>
  </div>)}</div>;
}

function EmptyChart({ label }: { label: string }) {
  return <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-[var(--analytics-border)] bg-[var(--analytics-soft)] px-5 text-center text-sm font-bold text-[var(--analytics-muted)]">{label}</div>;
}
