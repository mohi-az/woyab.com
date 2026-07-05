import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [userId, t] = await Promise.all([requireUserId(), getTranslations("Dashboard.overview")]);
  const [user, favorites, addresses, reviews, businesses] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, role: true } }), prisma.favorite.count({ where: { userId } }), prisma.userSavedLocation.count({ where: { userId } }), prisma.review.count({ where: { userId } }),
    prisma.business.count({ where: { ownerId: userId } }),
  ]);
  const cards = [[t("favorites"), favorites, "/dashboard/favorites"], [t("addresses"), addresses, "/dashboard/addresses"], [t("reviews"), reviews, "/dashboard/reviews"]] as const;
  const hasOwnerAccess = businesses > 0 || user.role === "OWNER" || user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  return <div><h1 className="text-3xl font-black text-slate-950">{t("greeting", { name: user.name || t("fallbackName") })}</h1><p className="mt-2 text-slate-500">{t("description")}</p><div className="mt-7 grid gap-4 sm:grid-cols-3">{cards.map(([label, count, href]) => <Link href={href} key={href} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/30"><strong className="text-3xl text-primary">{count}</strong><p className="mt-2 font-bold text-slate-700">{label}</p></Link>)}</div>{hasOwnerAccess ? <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white"><h2 className="text-lg font-black">Business owner tools</h2><p className="mt-2 text-sm leading-6 text-slate-300">Manage listings, visitor stats and review replies from your owner dashboard.</p><Link href="/dashboard/owner" className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-white">Open owner dashboard</Link></div> : null}<div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-black">{t("completionTitle")}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{t("completionDescription")}</p><Link href="/dashboard/profile" className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-white">{t("editProfile")}</Link></div></div>;
}
