import { getLocale, getTranslations } from "next-intl/server";
import { FiBriefcase, FiCalendar, FiEye } from "react-icons/fi";
import { AnalyticsCard, AnalyticsMetric } from "@/components/analytics/AnalyticsUI";
import { RankingBars, TrendChart } from "@/components/analytics/AnalyticsCharts";
import { isAppLocale } from "@/i18n/config";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function OwnerAnalyticsPage({ searchParams }: Props) {
  const [userId, params, t, requestedLocale] = await Promise.all([requireUserId(), searchParams, getTranslations("Analytics"), getLocale()]);
  const locale = isAppLocale(requestedLocale) ? requestedLocale : "de";
  const days = [7, 30, 90, 365].includes(Number(one(params.days))) ? Number(one(params.days)) : 30;
  const requestedBusinessId = one(params.businessId) || "";
  const businesses = await prisma.business.findMany({ where: { ownerId: userId }, select: { id: true, businessName: true }, orderBy: { businessName: "asc" } });
  const allowedIds = new Set(businesses.map((business) => business.id));
  const selectedId = allowedIds.has(requestedBusinessId) ? requestedBusinessId : "";
  const start = new Date(); start.setUTCHours(0,0,0,0); start.setUTCDate(start.getUTCDate() - days + 1);
  const selectedIds = selectedId ? [selectedId] : [...allowedIds];
  const [rows, events] = businesses.length ? await Promise.all([
    prisma.businessViewDaily.findMany({ where: { businessId: { in: selectedIds }, day: { gte: start } }, select: { day: true, views: true, business: { select: { businessName: true } } }, orderBy: { day: "asc" } }),
    prisma.businessAnalyticsEvent.findMany({ where: { businessId: { in: selectedIds }, occurredAt: { gte: start } }, select: { visitorId: true, sessionId: true } }),
  ]) : [[], []] as const;
  const daily = new Map<string, number>(); for (let i=0;i<days;i++){ const d=new Date(start); d.setUTCDate(start.getUTCDate()+i); daily.set(d.toISOString().slice(0,10),0); }
  const ranking = new Map<string, number>();
  for (const row of rows) { const key=row.day.toISOString().slice(0,10); daily.set(key,(daily.get(key)??0)+row.views); ranking.set(row.business.businessName,(ranking.get(row.business.businessName)??0)+row.views); }
  const total = rows.reduce((sum,row)=>sum+row.views,0); const formatter = new Intl.DateTimeFormat(locale,{month:"short",day:"numeric"});
  const uniqueVisitors = new Set(events.map(event => event.visitorId)).size;
  const sessions = new Set(events.map(event => event.sessionId)).size;
  const trend=[...daily].map(([date,value])=>({label:formatter.format(new Date(`${date}T00:00:00Z`)),value}));
  const ranks=[...ranking].sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value}));
  return <div className="analytics-owner space-y-6">
    <div><h1 className="text-3xl font-black text-[var(--analytics-text)]">{t("title")}</h1><p className="mt-2 text-[var(--analytics-muted)]">{t("ownerDescription")}</p></div>
    <form className="analytics-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_1fr_auto]">
      <select name="days" defaultValue={days} className="analytics-input"><option value="7">{t("ranges.7")}</option><option value="30">{t("ranges.30")}</option><option value="90">{t("ranges.90")}</option><option value="365">{t("ranges.365")}</option></select>
      <select name="businessId" defaultValue={selectedId} className="analytics-input"><option value="">{t("allBusinesses")}</option>{businesses.map(b=><option key={b.id} value={b.id}>{b.businessName}</option>)}</select>
      <button className="min-h-11 rounded-xl bg-primary px-5 font-black text-white">{t("apply")}</button>
    </form>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><AnalyticsMetric icon={FiEye} label={t("totalViews")} value={total}/><AnalyticsMetric icon={FiBriefcase} label={t("uniqueVisitors")} value={uniqueVisitors} accent="violet"/><AnalyticsMetric icon={FiCalendar} label={t("sessions")} value={sessions} accent="emerald"/><AnalyticsMetric icon={FiCalendar} label={t("dailyAverage")} value={Math.round(total/days)} accent="amber"/></div>
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]"><AnalyticsCard title={t("trend")} description={t("trendDescription")}><TrendChart data={trend} emptyLabel={t("empty")} ariaLabel={t("trend")}/></AnalyticsCard><AnalyticsCard title={t("topBusinesses")}><RankingBars data={ranks} emptyLabel={t("empty")}/></AnalyticsCard></div>
  </div>;
}
