import { getLocale, getTranslations } from "next-intl/server";
import { FiBriefcase, FiCheckSquare, FiFlag, FiInbox, FiMessageSquare, FiShield, FiUsers } from "react-icons/fi";
import { AdminSection, StatCard, StatusBadge } from "@/components/admin/AdminPrimitives";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";

function countByStatus(items: Array<{ status: string; _count: { _all: number } }>) {
  return new Map(items.map((item) => [item.status, item._count._all]));
}

function sparkline(items: Array<{ createdAt: Date }>) {
  const now = new Date();
  const days = Array.from({ length: 14 }, (_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (13 - index));
    day.setHours(0, 0, 0, 0);
    return { day, count: 0 };
  });

  for (const item of items) {
    const day = new Date(item.createdAt);
    day.setHours(0, 0, 0, 0);
    const match = days.find((entry) => entry.day.getTime() === day.getTime());
    if (match) match.count += 1;
  }

  const max = Math.max(1, ...days.map((day) => day.count));
  return days.map((day) => ({ ...day, height: Math.max(8, Math.round((day.count / max) * 112)) }));
}

export default async function AdminOverviewPage() {
  const [t, requestedLocale] = await Promise.all([getTranslations("Admin"), getLocale()]);
  const locale = isAppLocale(requestedLocale) ? requestedLocale : "de";
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    totalBusinesses,
    totalUsers,
    totalReviews,
    businessStatuses,
    reviewStatuses,
    openReports,
    pendingClaims,
    newMessages,
    openTickets,
    recentBusinesses,
    recentReviews,
    pendingBusinesses,
    pendingReviews,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.user.count(),
    prisma.review.count(),
    prisma.business.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.review.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.directoryReport.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    prisma.businessClaim.count({ where: { status: { in: ["PENDING_VERIFICATION", "UNDER_REVIEW"] } } }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "PENDING"] } } }),
    prisma.business.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.review.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.business.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, businessName: true, status: true, createdAt: true },
    }),
    prisma.review.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { business: { select: { businessName: true } }, user: { select: { name: true, email: true } } },
    }),
  ]);

  const businessStatusMap = countByStatus(businessStatuses);
  const reviewStatusMap = countByStatus(reviewStatuses);
  const businessBars = sparkline(recentBusinesses);
  const reviewBars = sparkline(recentReviews);
  const dateFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-black text-white">{t("overview.title")}</h1>
        <p className="mt-2 max-w-3xl text-slate-400">{t("overview.description")}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("metrics.businesses")} value={totalBusinesses} icon={FiBriefcase} tone="blue" />
        <StatCard label={t("metrics.users")} value={totalUsers} icon={FiUsers} tone="green" />
        <StatCard label={t("metrics.reviews")} value={totalReviews} icon={FiCheckSquare} tone="purple" />
        <StatCard label={t("metrics.queue")} value={openReports + pendingClaims + newMessages + openTickets} icon={FiInbox} tone="orange" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminSection title={t("overview.businessHealth")} description={t("overview.businessHealthDescription")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {["PENDING", "ACTIVE", "SUSPENDED", "CLOSED", "REJECTED"].map((status) => (
              <div key={status} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                <StatusBadge status={status} />
                <strong className="text-xl text-white">{businessStatusMap.get(status) ?? 0}</strong>
              </div>
            ))}
          </div>
        </AdminSection>

        <AdminSection title={t("overview.reviewHealth")} description={t("overview.reviewHealthDescription")}>
          <div className="grid gap-3 sm:grid-cols-3">
            {["PENDING", "APPROVED", "REJECTED"].map((status) => (
              <div key={status} className="rounded-lg bg-white/5 p-4">
                <StatusBadge status={status} />
                <strong className="mt-4 block text-3xl text-white">{reviewStatusMap.get(status) ?? 0}</strong>
              </div>
            ))}
          </div>
        </AdminSection>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminSection title={t("overview.businessTrend")} description={t("overview.lastThirtyDays")}>
          <div className="flex h-40 items-end gap-2">
            {businessBars.map((bar) => (
              <div key={bar.day.toISOString()} className="group flex flex-1 flex-col items-center justify-end gap-2">
                <div className="w-full rounded-t-md bg-sky-400" style={{ height: bar.height }} title={`${dateFormatter.format(bar.day)}: ${bar.count}`} />
                <span className="hidden text-[10px] text-slate-500 sm:block">{bar.day.getDate()}</span>
              </div>
            ))}
          </div>
        </AdminSection>

        <AdminSection title={t("overview.reviewTrend")} description={t("overview.lastThirtyDays")}>
          <div className="flex h-40 items-end gap-2">
            {reviewBars.map((bar) => (
              <div key={bar.day.toISOString()} className="group flex flex-1 flex-col items-center justify-end gap-2">
                <div className="w-full rounded-t-md bg-violet-400" style={{ height: bar.height }} title={`${dateFormatter.format(bar.day)}: ${bar.count}`} />
                <span className="hidden text-[10px] text-slate-500 sm:block">{bar.day.getDate()}</span>
              </div>
            ))}
          </div>
        </AdminSection>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSection title={t("overview.pendingBusinesses")} action={<Link href="/admin/businesses?status=PENDING" className="rounded-lg bg-white px-4 py-2 text-sm font-black text-[#20283d]">{t("actions.viewAll")}</Link>}>
          <div className="space-y-3">
            {pendingBusinesses.map((business) => (
              <Link key={business.id} href={`/admin/businesses?focus=${business.id}`} className="flex items-center justify-between gap-4 rounded-lg bg-white/5 p-4 hover:bg-white/8">
                <span className="font-bold text-white">{business.businessName}</span>
                <StatusBadge status={business.status} />
              </Link>
            ))}
            {!pendingBusinesses.length ? <p className="rounded-lg border border-dashed border-white/10 p-6 text-center text-slate-400">{t("empty.noPendingBusinesses")}</p> : null}
          </div>
        </AdminSection>

        <AdminSection title={t("overview.pendingReviews")} action={<Link href="/admin/reviews?status=PENDING" className="rounded-lg bg-white px-4 py-2 text-sm font-black text-[#20283d]">{t("actions.viewAll")}</Link>}>
          <div className="space-y-3">
            {pendingReviews.map((review) => (
              <Link key={review.id} href={`/admin/reviews?focus=${review.id}`} className="block rounded-lg bg-white/5 p-4 hover:bg-white/8">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-white">{review.business.businessName}</span>
                  <StatusBadge status={review.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">{review.comment || review.title || review.user.name || review.user.email}</p>
              </Link>
            ))}
            {!pendingReviews.length ? <p className="rounded-lg border border-dashed border-white/10 p-6 text-center text-slate-400">{t("empty.noPendingReviews")}</p> : null}
          </div>
        </AdminSection>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/reports" className="rounded-lg border border-white/8 bg-[#20283d] p-5 text-white hover:border-sky-400/40"><FiFlag className="h-6 w-6 text-sky-300" /><strong className="mt-4 block text-2xl">{openReports}</strong><span className="text-sm text-slate-400">{t("metrics.reports")}</span></Link>
        <Link href="/admin/claims" className="rounded-lg border border-white/8 bg-[#20283d] p-5 text-white hover:border-sky-400/40"><FiShield className="h-6 w-6 text-sky-300" /><strong className="mt-4 block text-2xl">{pendingClaims}</strong><span className="text-sm text-slate-400">{t("metrics.claims")}</span></Link>
        <Link href="/admin/messages" className="rounded-lg border border-white/8 bg-[#20283d] p-5 text-white hover:border-sky-400/40"><FiInbox className="h-6 w-6 text-sky-300" /><strong className="mt-4 block text-2xl">{newMessages}</strong><span className="text-sm text-slate-400">{t("metrics.messages")}</span></Link>
        <Link href="/admin/tickets" className="rounded-lg border border-white/8 bg-[#20283d] p-5 text-white hover:border-sky-400/40"><FiMessageSquare className="h-6 w-6 text-sky-300" /><strong className="mt-4 block text-2xl">{openTickets}</strong><span className="text-sm text-slate-400">{t("metrics.tickets")}</span></Link>
      </div>
    </div>
  );
}
