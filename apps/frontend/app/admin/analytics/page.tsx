import { getLocale, getTranslations } from "next-intl/server";
import { FiBriefcase, FiCalendar, FiEye, FiMapPin } from "react-icons/fi";
import { AnalyticsMetric, AnalyticsCard } from "@/components/analytics/AnalyticsUI";
import { TrendChart } from "@/components/analytics/AnalyticsCharts";
import { AnalyticsRankings } from "@/components/analytics/AnalyticsRankings";
import { AdminSearchSelect } from "@/components/admin/AdminSearchSelect";
import { isAppLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  const [params, t, requestedLocale] = await Promise.all([searchParams, getTranslations("Analytics"), getLocale()]);
  const locale = isAppLocale(requestedLocale) ? requestedLocale : "de";
  const days = [7, 30, 90, 365].includes(Number(one(params.days))) ? Number(one(params.days)) : 30;
  const businessId = one(params.businessId) || "";
  const cityId = Number(one(params.cityId)) || 0;
  const categoryId = Number(one(params.categoryId)) || 0;
  const start = new Date(); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - days + 1);
  const businessWhere = { ...(businessId ? { id: businessId } : {}), ...(cityId ? { cityId } : {}), ...(categoryId ? { categoryId } : {}) };
  const [rows, events, businesses, cities, categories] = await Promise.all([
    prisma.businessViewDaily.findMany({ where: { day: { gte: start }, business: businessWhere }, select: { day: true, views: true, business: { select: { id: true, businessName: true, city: { select: { id: true, nameEn: true, nameFa: true } }, category: { select: { id: true, nameEn: true, nameDe: true, nameFa: true } } } } }, orderBy: { day: "asc" } }),
    prisma.businessAnalyticsEvent.findMany({ where: { occurredAt: { gte: start }, business: businessWhere }, select: { visitorId: true, sessionId: true, business: { select: { businessName: true, city: { select: { nameEn: true, nameFa: true } }, category: { select: { nameEn: true, nameDe: true, nameFa: true } } } } } }),
    prisma.business.findMany({ where: { status: "ACTIVE" }, select: { id: true, businessName: true }, orderBy: { businessName: "asc" } }),
    prisma.city.findMany({ select: { id: true, nameEn: true, nameFa: true }, orderBy: { nameEn: "asc" } }),
    prisma.category.findMany({ select: { id: true, nameEn: true, nameDe: true, nameFa: true }, orderBy: { nameEn: "asc" } }),
  ]);
  const total = rows.reduce((sum, row) => sum + row.views, 0);
  const uniqueVisitors = new Set(events.map(event => event.visitorId)).size;
  const sessions = new Set(events.map(event => event.sessionId)).size;
  const dateFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const daily = new Map<string, number>();
  for (let i = 0; i < days; i++) { const date = new Date(start); date.setUTCDate(start.getUTCDate() + i); daily.set(date.toISOString().slice(0, 10), 0); }
  const byBusiness = new Map<string, number>(), byCity = new Map<string, number>(), byCategory = new Map<string, number>();
  const uniqueBusiness = new Map<string, Set<string>>(), uniqueCity = new Map<string, Set<string>>(), uniqueCategory = new Map<string, Set<string>>();
  for (const row of rows) {
    const key = row.day.toISOString().slice(0, 10); daily.set(key, (daily.get(key) ?? 0) + row.views);
    byBusiness.set(row.business.businessName, (byBusiness.get(row.business.businessName) ?? 0) + row.views);
    const city = locale === "fa" ? row.business.city.nameFa : row.business.city.nameEn; byCity.set(city, (byCity.get(city) ?? 0) + row.views);
    const category = locale === "fa" ? row.business.category.nameFa : locale === "de" ? row.business.category.nameDe || row.business.category.nameEn : row.business.category.nameEn; byCategory.set(category, (byCategory.get(category) ?? 0) + row.views);
  }
  for (const event of events) {
    const city = locale === "fa" ? event.business.city.nameFa : event.business.city.nameEn;
    const category = locale === "fa" ? event.business.category.nameFa : locale === "de" ? event.business.category.nameDe || event.business.category.nameEn : event.business.category.nameEn;
    for (const [map, key] of [[uniqueBusiness, event.business.businessName], [uniqueCity, city], [uniqueCategory, category]] as const) {
      const visitors = map.get(key) ?? new Set<string>(); visitors.add(event.visitorId); map.set(key, visitors);
    }
  }
  const rank = (map: Map<string, number>) => [...map].sort((a,b) => b[1]-a[1]).slice(0, 8).map(([label,value]) => ({ label, value }));
  const uniqueRank = (map: Map<string, Set<string>>) => [...map].map(([label, visitors]) => [label, visitors.size] as const).sort((a,b) => b[1]-a[1]).slice(0,8).map(([label,value]) => ({label,value}));
  const trend = [...daily].map(([date, value]) => ({ label: dateFormat.format(new Date(`${date}T00:00:00Z`)), value }));
  return <div className="analytics-scope space-y-6">
    <div><h1 className="text-3xl font-black text-[var(--analytics-text)]">{t("title")}</h1><p className="mt-2 text-[var(--analytics-muted)]">{t("adminDescription")}</p></div>
    <form className="analytics-card admin-analytics-filters grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
      <AdminSearchSelect name="days" defaultValue={days} className="admin-analytics-filter" options={[7, 30, 90, 365].map(value => ({ value: String(value), label: t(`ranges.${value}`) }))} />
      <AdminSearchSelect name="cityId" defaultValue={cityId || ""} className="admin-analytics-filter" allowClear placeholder={t("allCities")} options={cities.map(c => ({ value: String(c.id), label: locale === "fa" ? c.nameFa : c.nameEn }))} />
      <AdminSearchSelect name="categoryId" defaultValue={categoryId || ""} className="admin-analytics-filter" allowClear placeholder={t("allCategories")} options={categories.map(c => ({ value: String(c.id), label: locale === "fa" ? c.nameFa : locale === "de" ? c.nameDe || c.nameEn : c.nameEn }))} />
      <AdminSearchSelect name="businessId" defaultValue={businessId} className="admin-analytics-filter" allowClear placeholder={t("allBusinesses")} options={businesses.map(b => ({ value: b.id, label: b.businessName }))} />
      <button className="admin-button min-h-11 rounded-lg border px-5 font-black sm:col-span-2 xl:col-span-1">{t("apply")}</button>
    </form>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><AnalyticsMetric icon={FiEye} label={t("totalViews")} value={total} /><AnalyticsMetric icon={FiBriefcase} label={t("uniqueVisitors")} value={uniqueVisitors} accent="violet" /><AnalyticsMetric icon={FiCalendar} label={t("sessions")} value={sessions} accent="emerald" /><AnalyticsMetric icon={FiMapPin} label={t("dailyAverage")} value={Math.round(total/days)} accent="amber" /></div>
    <AnalyticsCard title={t("trend")} description={t("trendDescription")}><TrendChart data={trend} emptyLabel={t("empty")} ariaLabel={t("trend")} /></AnalyticsCard>
    <AnalyticsRankings labels={{ views: t("totalViews"), unique: t("uniqueVisitors"), empty: t("empty"), open: t("openBusinessReport") }} rankings={[{ title: t("topBusinesses"), views: rank(byBusiness), unique: uniqueRank(uniqueBusiness), href: "/admin/analytics/businesses" }, { title: t("topCities"), views: rank(byCity), unique: uniqueRank(uniqueCity) }, { title: t("topCategories"), views: rank(byCategory), unique: uniqueRank(uniqueCategory) }]} />
  </div>;
}
