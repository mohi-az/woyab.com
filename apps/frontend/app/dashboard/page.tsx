import { getTranslations } from "next-intl/server";
import { FiBriefcase, FiHeart, FiMapPin, FiStar } from "react-icons/fi";
import { Link } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [userId, t] = await Promise.all([requireUserId(), getTranslations("Dashboard.overview")]);
  const [user, favorites, addresses, reviews, businesses] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, role: true, avatarUrl: true } }),
    prisma.favorite.count({ where: { userId } }),
    prisma.userSavedLocation.count({ where: { userId } }),
    prisma.review.count({ where: { userId } }),
    prisma.business.count({ where: { ownerId: userId } }),
  ]);

  const displayName = user.name || t("fallbackName");
  const hasOwnerAccess =
    businesses > 0 ||
    user.role === "OWNER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN";

  const statCards = [
    { label: t("favorites"), count: favorites, href: "/dashboard/favorites", icon: FiHeart, accent: "bg-rose-50 text-rose-600" },
    { label: t("addresses"), count: addresses, href: "/dashboard/addresses", icon: FiMapPin, accent: "bg-sky-50 text-sky-600" },
    { label: t("reviews"), count: reviews, href: "/dashboard/reviews", icon: FiStar, accent: "bg-amber-50 text-amber-600" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <div className="flex items-center gap-4 rounded-[28px] bg-white p-6 shadow-sm border border-slate-200">
        {user.avatarUrl ? (
          <span
            className="h-14 w-14 shrink-0 rounded-full bg-cover bg-center ring-2 ring-primary/20"
            style={{ backgroundImage: `url(${user.avatarUrl})` }}
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-black text-primary">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-black text-slate-950">{t("greeting", { name: displayName })}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("description")}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map(({ label, count, href, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg transition group-hover:scale-110 ${accent}`}>
              <Icon />
            </span>
            <div>
              <strong className="block text-2xl font-black text-primary">{count}</strong>
              <p className="mt-0.5 text-sm font-bold text-slate-600">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Business portal CTA (only for owners) */}
      {hasOwnerAccess ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-950 p-6 text-white">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/20 text-lg text-primary-light">
              <FiBriefcase />
            </span>
            <div>
              <h2 className="font-black">Business owner tools</h2>
              <p className="mt-0.5 text-sm text-slate-300">Manage listings, analytics and reviews</p>
            </div>
          </div>
          <Link
            href="/business-portal"
            className="inline-flex min-h-10 items-center rounded-xl bg-primary px-5 text-sm font-black text-white"
          >
            Open Business Portal â†’
          </Link>
        </div>
      ) : null}

      {/* Profile completion */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-black text-slate-950">{t("completionTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{t("completionDescription")}</p>
        <Link href="/dashboard/profile" className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-white">
          {t("editProfile")}
        </Link>
      </div>
    </div>
  );
}
