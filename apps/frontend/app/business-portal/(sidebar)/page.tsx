import { getTranslations } from "next-intl/server";
import { FiBriefcase, FiBarChart2, FiEdit, FiExternalLink, FiMessageSquare, FiPlus, FiStar } from "react-icons/fi";
import { Link } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { ClaimDetailCard } from "@/components/dashboard/ClaimDetailCard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Business Portal | woYab" };

export default async function BusinessPortalPage() {
  const [userId, t] = await Promise.all([requireUserId(), getTranslations("BusinessPortal.overview")]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const businesses = await prisma.business.findMany({
    where: { ownerId: userId },
    orderBy: [{ status: "asc" }, { businessName: "asc" }],
    select: {
      id: true,
      slug: true,
      businessName: true,
      status: true,
      removedAt: true,
      reviewCount: true,
      _count: { select: { changeRequests: { where: { status: "PENDING" } } } },
      businessViewDaily: {
        where: { day: { gte: thirtyDaysAgo } },
        select: { views: true },
      },
    },
  });

  const claims = await prisma.businessClaim.findMany({
    where: { claimantUserId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      officialBusinessEmail: true,
      claimantName: true,
      verifiedAt: true,
      reviewedAt: true,
      decisionReason: true,
      business: { select: { businessName: true, slug: true } },
      notes: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          attachmentUrl: true,
          attachmentName: true,
          attachments: true,
          isAdminNote: true,
          createdAt: true,
          author: { select: { name: true, role: true } },
        },
      },
    },
  });

  const serializedClaims = claims.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    verifiedAt: c.verifiedAt?.toISOString() ?? null,
    reviewedAt: c.reviewedAt?.toISOString() ?? null,
    notes: c.notes.map((n) => ({
      ...n,
      attachments: claimNoteAttachments(n.attachments),
      createdAt: n.createdAt.toISOString(),
    })),
  }));

  if (!businesses.length && !claims.length) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl text-primary">
          <FiBriefcase />
        </span>
        <h1 className="mt-6 text-2xl font-black text-slate-950">{t("emptyTitle")}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">{t("emptyDescription")}</p>
        <Link
          href="/business-portal/new"
          className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-6 text-sm font-black text-white"
        >
          <FiPlus />
          {t("emptyAction")}
        </Link>
      </div>
    );
  }

  const totalViews = businesses.reduce(
    (sum, b) => sum + b.businessViewDaily.reduce((s, v) => s + v.views, 0),
    0,
  );
  const totalReviews = businesses.reduce((sum, b) => sum + b.reviewCount, 0);

  const statusLabel = (b: (typeof businesses)[0]) => {
    if (b.removedAt) return { label: t("statusHidden"), cls: "bg-slate-100 text-slate-600" };
    const map: Record<string, { label: string; cls: string }> = {
      ACTIVE: { label: t("statusActive"), cls: "bg-emerald-100 text-emerald-800" },
      PENDING: { label: t("statusPending"), cls: "bg-amber-100 text-amber-800" },
      REJECTED: { label: t("statusRejected"), cls: "bg-rose-100 text-rose-800" },
      DRAFT: { label: t("statusDraft"), cls: "bg-slate-100 text-slate-600" },
    };
    return map[b.status] ?? { label: b.status, cls: "bg-slate-100 text-slate-600" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-[28px] bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,.16)]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-primary-light">Business Portal</p>
          <h1 className="mt-3 text-3xl font-black">{t("title")}</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">{t("description")}</p>
        </div>
        <Link
          href="/business-portal/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white"
        >
          <FiPlus />
          {t("addAnother")}
        </Link>
      </div>

      {/* Aggregate stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<FiBriefcase />} label={t("totalBusinesses", { count: businesses.length })} value={businesses.length} />
        <StatCard icon={<FiBarChart2 />} label={t("totalViews")} value={totalViews} />
        <StatCard icon={<FiStar />} label={t("totalReviews")} value={totalReviews} />
      </div>

      {/* Business cards grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {businesses.map((business) => {
          const views30d = business.businessViewDaily.reduce((s, v) => s + v.views, 0);
          const status = statusLabel(business);
          return (
            <div
              key={business.id}
              className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-black ${status.cls}`}>
                    {status.label}
                  </span>
                  <h2 className="mt-2 text-lg font-black text-slate-950">{business.businessName}</h2>
                  {business._count.changeRequests > 0 ? (
                    <p className="mt-1 text-xs font-bold text-amber-700">
                      {business._count.changeRequests} pending change{business._count.changeRequests !== 1 ? "s" : ""}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50">
                <MiniStat label={t("statsViews")} value={views30d} />
                <MiniStat label={t("statsReviews")} value={business.reviewCount} />
                <MiniStat label={t("statsPending")} value={business._count.changeRequests} />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/business-portal/${business.id}/edit`}
                  className="flex min-h-9 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white"
                >
                  <FiEdit className="text-sm" />
                  {t("actionEdit")}
                </Link>
                <Link
                  href={`/business-portal/${business.id}/analytics`}
                  className="flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700 hover:border-primary/30 hover:text-primary"
                >
                  <FiBarChart2 className="text-sm" />
                  {t("actionAnalytics")}
                </Link>
                <Link
                  href={`/business-portal/${business.id}/reviews`}
                  className="flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700 hover:border-primary/30 hover:text-primary"
                >
                  <FiMessageSquare className="text-sm" />
                  {t("statsReviews")}
                </Link>
                {!business.removedAt && business.status === "ACTIVE" ? (
                  <Link
                    href={`/businesses/${business.slug}`}
                    className="flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700 hover:border-primary/30 hover:text-primary"
                  >
                    <FiExternalLink className="text-sm" />
                    {t("actionPublicPage")}
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Claims Section */}
      {serializedClaims.length > 0 && (
        <div className="mt-12 space-y-4">
          <h2 className="text-xl font-black text-slate-950 mb-4">{t("claimsTitle") || "درخواست‌های مالکیت در جریان"}</h2>
          <div className="space-y-4">
            {serializedClaims.map((claim) => (
              <ClaimDetailCard key={claim.id} claim={claim} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function claimNoteAttachments(value: unknown): Array<{ url: string; name: string }> | null {
  if (!Array.isArray(value)) return null;

  const attachments = value.flatMap((attachment) => {
    if (!attachment || typeof attachment !== "object") return [];
    const { url, name } = attachment as { url?: unknown; name?: unknown };
    if (typeof url !== "string" || !url) return [];
    return [{ url, name: typeof name === "string" && name ? name : "Attachment" }];
  });

  return attachments.length ? attachments : null;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-lg text-primary">
        {icon}
      </span>
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-950">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 py-3 text-center">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-black text-slate-950">{value.toLocaleString()}</p>
    </div>
  );
}
