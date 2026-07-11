"use client";

import { useMemo, useState } from "react";
import { FiArrowDown, FiArrowUp, FiCheck, FiSearch } from "react-icons/fi";
import { Link } from "@/i18n/navigation";

export type BusinessAnalyticsRow = { id: string; slug: string; name: string; city: string; category: string; views: number; unique: number; sessions: number; previousViews: number };

export function BusinessAnalyticsTable({ rows, labels }: { rows: BusinessAnalyticsRow[]; labels: Record<string,string> }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"views"|"unique"|"sessions"|"change">("views");
  const change = (row: BusinessAnalyticsRow) => row.previousViews ? ((row.views-row.previousViews)/row.previousViews)*100 : row.views ? 100 : 0;
  const data = useMemo(() => rows.filter(row => `${row.name} ${row.city} ${row.category}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a,b) => {
    if (sort === "change") return change(b)-change(a);
    return b[sort]-a[sort];
  }), [rows, query, sort]);
  return <div className="analytics-card overflow-hidden rounded-2xl border shadow-sm">
    <div className="flex flex-col gap-3 border-b border-[var(--analytics-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <label className="relative block sm:max-w-sm sm:flex-1"><FiSearch className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--analytics-muted)]"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={labels.search} className="analytics-input ps-10" /></label>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">{(["views","unique","sessions","change"] as const).map(key=><button type="button" key={key} onClick={()=>setSort(key)} aria-pressed={sort===key} className="analytics-sort inline-flex min-h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-black transition">{labels[key]}{sort===key?<FiCheck className="analytics-button-check"/>:null}</button>)}</div>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="bg-[var(--analytics-soft)] text-[var(--analytics-muted)]"><tr>{["business","views","unique","sessions","ratio","change"].map(key=><th key={key} className="px-5 py-3 text-start text-xs font-black uppercase">{labels[key]}</th>)}</tr></thead><tbody className="divide-y divide-[var(--analytics-border)]">{data.map(row=>{const delta=change(row);return <tr key={row.id} className="transition hover:bg-[var(--analytics-soft)]"><td className="px-5 py-4"><Link href={`/businesses/${row.slug}`} className="font-black text-[var(--analytics-text)] hover:text-sky-500">{row.name}</Link><p className="mt-1 text-xs text-[var(--analytics-muted)]">{row.city} · {row.category}</p></td><td className="px-5 py-4 font-black tabular-nums">{row.views.toLocaleString()}</td><td className="px-5 py-4 font-black tabular-nums">{row.unique.toLocaleString()}</td><td className="px-5 py-4 tabular-nums">{row.sessions.toLocaleString()}</td><td className="px-5 py-4 tabular-nums">{row.unique ? (row.views/row.unique).toFixed(1) : "—"}</td><td className={`px-5 py-4 font-black tabular-nums ${delta>0?"text-emerald-500":delta<0?"text-rose-500":"text-[var(--analytics-muted)]"}`}><span className="inline-flex items-center gap-1">{delta>0?<FiArrowUp/>:delta<0?<FiArrowDown/>:null}{Math.abs(delta).toFixed(0)}%</span></td></tr>})}</tbody></table></div>
    {!data.length?<p className="p-10 text-center font-bold text-[var(--analytics-muted)]">{labels.empty}</p>:null}
  </div>;
}
