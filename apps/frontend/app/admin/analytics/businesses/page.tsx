import { getLocale, getTranslations } from "next-intl/server";
import { FiActivity, FiEye, FiUsers } from "react-icons/fi";
import { BusinessAnalyticsTable, type BusinessAnalyticsRow } from "@/components/analytics/BusinessAnalyticsTable";
import { AnalyticsMetric } from "@/components/analytics/AnalyticsUI";
import { isAppLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";

export default async function BusinessAnalyticsPage() {
  const [t, requestedLocale] = await Promise.all([getTranslations("Analytics"), getLocale()]);
  const locale = isAppLocale(requestedLocale) ? requestedLocale : "de";
  const end = new Date(), start = new Date(); start.setUTCDate(start.getUTCDate()-29); start.setUTCHours(0,0,0,0);
  const previousStart = new Date(start); previousStart.setUTCDate(previousStart.getUTCDate()-30);
  const [businesses, viewRows, events] = await Promise.all([
    prisma.business.findMany({ where:{status:"ACTIVE"}, select:{id:true,slug:true,businessName:true,city:{select:{nameEn:true,nameFa:true}},category:{select:{nameEn:true,nameFa:true}}} }),
    prisma.businessViewDaily.findMany({ where:{day:{gte:previousStart,lt:end}},select:{businessId:true,day:true,views:true} }),
    prisma.businessAnalyticsEvent.findMany({ where:{occurredAt:{gte:start,lt:end}},select:{businessId:true,visitorId:true,sessionId:true} }),
  ]);
  const currentViews=new Map<string,number>(), previousViews=new Map<string,number>(), visitors=new Map<string,Set<string>>(), sessions=new Map<string,Set<string>>();
  for(const row of viewRows){const map=row.day>=start?currentViews:previousViews;map.set(row.businessId,(map.get(row.businessId)??0)+row.views)}
  for(const event of events){const v=visitors.get(event.businessId)??new Set<string>();v.add(event.visitorId);visitors.set(event.businessId,v);const s=sessions.get(event.businessId)??new Set<string>();s.add(event.sessionId);sessions.set(event.businessId,s)}
  const rows:BusinessAnalyticsRow[]=businesses.map(b=>({id:b.id,slug:b.slug,name:b.businessName,city:locale==="fa"?b.city.nameFa:b.city.nameEn,category:locale==="fa"?b.category.nameFa:b.category.nameEn,views:currentViews.get(b.id)??0,previousViews:previousViews.get(b.id)??0,unique:visitors.get(b.id)?.size??0,sessions:sessions.get(b.id)?.size??0}));
  const totalViews=rows.reduce((s,r)=>s+r.views,0), totalUnique=new Set(events.map(e=>e.visitorId)).size, totalSessions=new Set(events.map(e=>e.sessionId)).size;
  return <div className="analytics-scope space-y-6"><div><p className="text-xs font-black uppercase tracking-[.2em] text-sky-500">{t("title")}</p><h1 className="mt-2 text-3xl font-black text-[var(--analytics-text)]">{t("businessReportTitle")}</h1><p className="mt-2 text-[var(--analytics-muted)]">{t("businessReportDescription")}</p></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><AnalyticsMetric icon={FiEye} label={t("totalViews")} value={totalViews}/><AnalyticsMetric icon={FiUsers} label={t("uniqueVisitors")} value={totalUnique} accent="violet"/><div className="col-span-2 lg:col-span-1"><AnalyticsMetric icon={FiActivity} label={t("sessions")} value={totalSessions} accent="emerald"/></div></div><BusinessAnalyticsTable rows={rows} labels={{search:t("searchBusinesses"),views:t("totalViews"),unique:t("uniqueVisitors"),sessions:t("sessions"),change:t("periodChange"),business:t("business"),ratio:t("viewsPerVisitor"),empty:t("empty")}}/></div>;
}
