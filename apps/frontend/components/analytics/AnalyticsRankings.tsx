"use client";

import { useState } from "react";
import { FiArrowUpRight, FiCheck, FiEye, FiUsers } from "react-icons/fi";
import { Link } from "@/i18n/navigation";
import { AnalyticsCard } from "@/components/analytics/AnalyticsUI";
import { RankingBars, type AnalyticsPoint } from "@/components/analytics/AnalyticsCharts";

type Ranking = { title: string; views: AnalyticsPoint[]; unique: AnalyticsPoint[]; href?: string };

export function AnalyticsRankings({ rankings, labels }: { rankings: Ranking[]; labels: { views: string; unique: string; empty: string; open: string } }) {
  const [mode, setMode] = useState<"views" | "unique">("views");
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="analytics-segmented inline-flex rounded-xl border border-[var(--analytics-border)] bg-[var(--analytics-soft)] p-1">
        <button type="button" aria-pressed={mode === "views"} onClick={() => setMode("views")} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-4 text-xs font-black transition"><FiEye />{labels.views}{mode === "views" ? <FiCheck className="analytics-button-check" /> : null}</button>
        <button type="button" aria-pressed={mode === "unique"} onClick={() => setMode("unique")} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-4 text-xs font-black transition"><FiUsers />{labels.unique}{mode === "unique" ? <FiCheck className="analytics-button-check" /> : null}</button>
      </div>
    </div>
    <div className="grid gap-6 xl:grid-cols-3">{rankings.map(item => <AnalyticsCard key={item.title} title={item.title} action={item.href ? <Link href={item.href} title={labels.open} aria-label={labels.open} className="analytics-icon-link grid h-10 w-10 place-items-center rounded-xl border"><FiArrowUpRight /></Link> : undefined}><RankingBars data={item[mode]} emptyLabel={labels.empty} /></AnalyticsCard>)}</div>
  </section>;
}
