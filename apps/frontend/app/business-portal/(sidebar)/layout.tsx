import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FaClipboardList } from "react-icons/fa";
import { FiLogIn } from "react-icons/fi";
import { BusinessPortalSidebar } from "@/components/dashboard/BusinessPortalSidebar";
import { Link } from "@/i18n/navigation";
import { currentUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function BusinessPortalLayout({ children }: { children: React.ReactNode }) {
  const userId = await currentUserId();

  if (!userId) {
    redirect("/login?callbackUrl=/business-portal");
  }

  const [user, businesses, unreadMessages, unansweredReviews] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, avatarUrl: true, role: true, _count: { select: { businesses: true } } },
    }),
    prisma.business.findMany({
      where: { ownerId: userId },
      orderBy: [{ status: "asc" }, { businessName: "asc" }],
      select: { id: true, businessName: true, status: true, removedAt: true },
    }),
    prisma.contactMessage.count({ where: { business: { ownerId: userId }, status: "NEW" } }),
    prisma.review.count({
      where: {
        business: { ownerId: userId },
        status: "APPROVED",
        ownerReply: null,
      },
    }),
  ]);

  const hasOwnerAccess =
    user.role === "OWNER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user._count.businesses > 0;

  // Regular users with no businesses see an access-denied screen (not a hard redirect)
  if (!hasOwnerAccess) {
    const t = await getTranslations("BusinessPortal.accessDenied");
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f8f5f1] px-4">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl text-primary">
            <FaClipboardList />
          </span>
          <h1 className="mt-6 text-2xl font-black text-slate-950">{t("title")}</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-7 text-slate-500">{t("description")}</p>
          <Link
            href="/add-business"
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-6 text-sm font-black text-white"
          >
            <FiLogIn />
            {t("action")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] bg-[#f8f5f1] px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[260px_1fr]">
        <BusinessPortalSidebar
          user={{ name: user.name ?? "", email: user.email, avatarUrl: user.avatarUrl }}
          businesses={businesses}
          unreadMessages={unreadMessages}
          unansweredReviews={unansweredReviews}
        />
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
