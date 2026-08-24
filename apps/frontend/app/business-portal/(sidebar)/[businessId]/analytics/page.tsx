import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { FiBriefcase, FiCalendar, FiEye } from "react-icons/fi";
import { AnalyticsCard, AnalyticsMetric } from "@/components/analytics/AnalyticsUI";
import { RankingBars, TrendChart } from "@/components/analytics/AnalyticsCharts";
import { isAppLocale } from "@/i18n/config";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { businessId } = await params;
  const b = await prisma.business.findFirst({ where: { id: businessId }, select: { businessName: true } });
  return { title: `Analytics — ${b?.businessName ?? "Business"} | Business Portal | WoYab` };
}

export default async function BusinessAnalyticsPage({ params, searchParams }: Props) {
  const [{ businessId }, sp, userId, t, requestedLocale] = await Promise.all([
    params,
    searchParams,
    requireUserId(),
    getTranslations("Analytics"),
    getLocale(),
  ]);

  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId: userId },
    select: { id: true, businessName: true },
  });
  if (!business) notFound();

  const locale = isAppLocale(requestedLocale) ? requestedLocale : "de";
  const days = [7, 30, 90, 365].includes(Number(one(sp.days))) ? Number(one(sp.days)) : 30;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);

  const [rows, events] = await Promise.all([
    prisma.businessViewDaily.findMany({
      where: { businessId, day: { gte: start } },
      select: { day: true, views: true },
      orderBy: { day: "asc" },
    }),
    prisma.businessAnalyticsEvent.findMany({
      where: { businessId, occurredAt: { gte: start } },
      select: { visitorId: true, sessionId: true },
    }),
  ]);

  const daily = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    daily.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const key = row.day.toISOString().slice(0, 10);
    daily.set(key, (daily.get(key) ?? 0) + row.views);
  }
  const total = rows.reduce((sum, row) => sum + row.views, 0);
  const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const uniqueVisitors = new Set(events.map((e) => e.visitorId)).size;
  const sessions = new Set(events.map((e) => e.sessionId)).size;
  const trend = [...daily].map(([date, value]) => ({
    label: formatter.format(new Date(`${date}T00:00:00Z`)),
    value,
  }));

  return (
    <div className="analytics-owner space-y-6">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">{business.businessName}</p>
        <h1 className="mt-1 text-3xl font-black text-[var(--analytics-text)]">{t("title")}</h1>
        <p className="mt-2 text-[var(--analytics-muted)]">{t("ownerDescription")}</p>
      </div>
      <form className="analytics-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_auto]">
        <select name="days" defaultValue={days} className="analytics-input">
          <option value="7">{t("ranges.7")}</option>
          <option value="30">{t("ranges.30")}</option>
          <option value="90">{t("ranges.90")}</option>
          <option value="365">{t("ranges.365")}</option>
        </select>
        <button className="min-h-11 rounded-xl bg-primary px-5 font-black text-white">{t("apply")}</button>
      </form>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AnalyticsMetric icon={FiEye} label={t("totalViews")} value={total} />
        <AnalyticsMetric icon={FiBriefcase} label={t("uniqueVisitors")} value={uniqueVisitors} accent="violet" />
        <AnalyticsMetric icon={FiCalendar} label={t("sessions")} value={sessions} accent="emerald" />
        <AnalyticsMetric icon={FiCalendar} label={t("dailyAverage")} value={Math.round(total / days)} accent="amber" />
      </div>
      <AnalyticsCard title={t("trend")} description={t("trendDescription")}>
        <TrendChart data={trend} emptyLabel={t("empty")} ariaLabel={t("trend")} />
      </AnalyticsCard>
    </div>
  );
}
