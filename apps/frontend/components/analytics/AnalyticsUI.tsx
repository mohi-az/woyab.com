import type { IconType } from "react-icons";

export function AnalyticsCard({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="analytics-card rounded-2xl border p-4 shadow-sm sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-[var(--analytics-text)] sm:text-xl">{title}</h2>{description ? <p className="mt-1 text-sm leading-6 text-[var(--analytics-muted)]">{description}</p> : null}</div>{action}</div>{children}</section>;
}

export function AnalyticsMetric({ icon: Icon, label, value, accent = "sky" }: { icon: IconType; label: string; value: string | number; accent?: "sky" | "violet" | "emerald" | "amber" }) {
  const tones = { sky: "bg-sky-500/12 text-sky-500", violet: "bg-violet-500/12 text-violet-500", emerald: "bg-emerald-500/12 text-emerald-500", amber: "bg-amber-500/12 text-amber-500" };
  return <div className="analytics-card flex min-h-28 items-center gap-4 rounded-2xl border p-4 shadow-sm"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tones[accent]}`}><Icon className="h-6 w-6" /></span><div className="min-w-0"><p className="truncate text-xs font-black text-[var(--analytics-muted)] sm:text-sm">{label}</p><strong className="mt-1 block text-2xl font-black tabular-nums text-[var(--analytics-text)] sm:text-3xl">{typeof value === "number" ? value.toLocaleString() : value}</strong></div></div>;
}
