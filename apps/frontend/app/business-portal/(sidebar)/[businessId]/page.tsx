import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FiBarChart2, FiEdit, FiExternalLink, FiMessageSquare, FiStar } from "react-icons/fi";
import { Link } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { CircularRatingStars } from "@/components/ui/CircularRatingStars";
import type { Metadata } from "next";

type Props = { params: Promise<{ businessId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { businessId } = await params;
  const b = await prisma.business.findFirst({ where: { id: businessId }, select: { businessName: true } });
  return { title: `${b?.businessName ?? "Business"} | Business Portal | WoYab` };
}

export default async function BusinessPortalBusinessPage({ params }: Props) {
  const [{ businessId }, userId, t] = await Promise.all([params, requireUserId(), getTranslations("BusinessPortal.overview")]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId: userId },
    select: {
      id: true,
      slug: true,
      businessName: true,
      shortDescription: true,
      status: true,
      removedAt: true,
      reviewCount: true,
      averageRating: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { changeRequests: { where: { status: "PENDING" } } } },
      businessViewDaily: { where: { day: { gte: thirtyDaysAgo } }, select: { views: true } },
      category: { select: { nameEn: true, nameDe: true, nameFa: true } },
      city: { select: { nameEn: true, nameFa: true } },
    },
  });

  if (!business) notFound();

  const views30d = business.businessViewDaily.reduce((s, v) => s + v.views, 0);

  const statusMap: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: t("statusActive"), cls: "bg-emerald-100 text-emerald-800" },
    PENDING: { label: t("statusPending"), cls: "bg-amber-100 text-amber-800" },
    REJECTED: { label: t("statusRejected"), cls: "bg-rose-100 text-rose-800" },
    DRAFT: { label: t("statusDraft"), cls: "bg-slate-100 text-slate-600" },
  };
  const status = business.removedAt
    ? { label: t("statusHidden"), cls: "bg-slate-100 text-slate-600" }
    : (statusMap[business.status] ?? { label: business.status, cls: "bg-slate-100 text-slate-600" });

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${status.cls}`}>{status.label}</span>
            <h1 className="mt-3 text-3xl font-black text-slate-950">{business.businessName}</h1>
            {business.shortDescription ? (
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{business.shortDescription}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/business-portal/${business.id}/edit`}
              className="flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white"
            >
              <FiEdit className="text-sm" />
              {t("actionEdit")}
            </Link>
            {!business.removedAt && business.status === "ACTIVE" ? (
              <Link
                href={`/businesses/${business.slug}`}
                className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 hover:border-primary/30 hover:text-primary"
              >
                <FiExternalLink className="text-sm" />
                {t("actionPublicPage")}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<FiBarChart2 />} label={t("statsViews")} value={views30d} />
        <StatCard icon={<FiStar />} label={t("statsReviews")} value={business.reviewCount} />
        <StatCard icon={<FiMessageSquare />} label={t("statsPending")} value={business._count.changeRequests} />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <QuickAction
          href={`/business-portal/${business.id}/analytics`}
          icon={<FiBarChart2 />}
          title="Visitor analytics"
          description="See daily views, unique visitors and session data"
        />
        <QuickAction
          href={`/business-portal/${business.id}/reviews`}
          icon={<FiStar />}
          title="Reviews"
          description="Read customer feedback and post verified owner replies"
        />
      </div>

      {/* Meta info */}
      <div className="rounded-[28px] border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <span>Average rating:</span>
          <CircularRatingStars rating={business.averageRating} size="xs" />
          <strong className="text-slate-800">{business.averageRating.toFixed(1)}</strong>
        </div>
        <p className="mt-1">Created: <strong className="text-slate-800">{business.createdAt.toLocaleDateString()}</strong></p>
        <p className="mt-1">Last updated: <strong className="text-slate-800">{business.updatedAt.toLocaleDateString()}</strong></p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-lg text-primary">{icon}</span>
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-950">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-lg text-primary">{icon}</span>
      <div>
        <p className="font-black text-slate-950">{title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
    </Link>
  );
}
