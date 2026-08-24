"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FiBarChart2, FiBriefcase, FiEdit, FiGrid, FiLifeBuoy, FiMessageSquare, FiPlus, FiStar } from "react-icons/fi";
import { Link } from "@/i18n/navigation";
import { stripLocalePrefix } from "@/i18n/config";
import { cn } from "@/lib/utils";

type Business = {
  id: string;
  businessName: string;
  status: string;
  removedAt: Date | null;
};

type PortalUser = {
  name: string;
  email: string | null;
  avatarUrl: string | null;
};

type Props = {
  user: PortalUser;
  businesses: Business[];
  unreadMessages: number;
  unansweredReviews: number;
};

export function BusinessPortalSidebar({ user, businesses, unreadMessages, unansweredReviews }: Props) {
  const t = useTranslations("BusinessPortal.sidebar");
  const pathname = usePathname();
  const internal = stripLocalePrefix(pathname);
  const [localUser, setLocalUser] = useState(user);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<Partial<PortalUser>>).detail;
      if (detail) setLocalUser((prev) => ({ ...prev, ...detail }));
    };
    window.addEventListener("woyab:profile-updated", sync);
    return () => window.removeEventListener("woyab:profile-updated", sync);
  }, []);

  const displayName = localUser.name || t("businessPortal");
  const initials = displayName.trim().slice(0, 1).toUpperCase();

  // Determine active business from URL
  const businessIdMatch = internal.match(/^\/business-portal\/([^/]+)/);
  const activeBizId = businessIdMatch ? businessIdMatch[1] : null;
  const activeBusiness = activeBizId && activeBizId !== "new" && activeBizId !== "analytics" && activeBizId !== "messages" && activeBizId !== "support"
    ? businesses.find((b) => b.id === activeBizId)
    : null;

  const navLink = (href: string, label: string, icon: React.ReactNode, badge?: number) => {
    const active = internal === href || (href !== "/business-portal" && internal.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-slate-600 hover:bg-slate-100 hover:text-primary",
        )}
      >
        <span className="shrink-0 text-base">{icon}</span>
        <span className="flex-1">{label}</span>
        {badge ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-28">
      {/* User info */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-1 pb-4">
        {localUser.avatarUrl ? (
          <span
            aria-label={displayName}
            className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center ring-2 ring-primary/15"
            style={{ backgroundImage: `url(${localUser.avatarUrl})` }}
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-black text-primary">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{displayName}</p>
          <p className="truncate text-xs text-slate-500">{localUser.email}</p>
        </div>
      </div>

      {/* Portal-level navigation */}
      <nav className="mt-3 space-y-0.5">
        {navLink("/business-portal", t("overview"), <FiGrid />)}
        {navLink("/business-portal/analytics", t("analytics"), <FiBarChart2 />)}
        {navLink("/business-portal/messages", t("messages"), <FiMessageSquare />, unreadMessages)}
        {navLink("/business-portal/support", t("support"), <FiLifeBuoy />)}
      </nav>

      {/* Per-business section (shown when a specific businessId is in the URL) */}
      {activeBusiness ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {activeBusiness.businessName}
          </p>
          <nav className="space-y-0.5">
            {navLink(`/business-portal/${activeBusiness.id}`, t("overview"), <FiBriefcase />)}
            {navLink(`/business-portal/${activeBusiness.id}/edit`, t("editBusiness"), <FiEdit />)}
            {navLink(`/business-portal/${activeBusiness.id}/reviews`, t("reviews"), <FiStar />, unansweredReviews)}
            {navLink(`/business-portal/${activeBusiness.id}/analytics`, t("analytics"), <FiBarChart2 />)}
          </nav>
        </div>
      ) : null}

      {/* Business switcher (shown when multiple businesses) */}
      {businesses.length > 1 ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {t("allBusinesses")}
          </p>
          <nav className="space-y-0.5">
            {businesses.slice(0, 6).map((b) => (
              <Link
                key={b.id}
                href={`/business-portal/${b.id}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors",
                  activeBizId === b.id
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:bg-slate-100 hover:text-primary",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    b.removedAt
                      ? "bg-slate-300"
                      : b.status === "ACTIVE"
                        ? "bg-emerald-500"
                        : b.status === "PENDING"
                          ? "bg-amber-500"
                          : "bg-slate-400",
                  )}
                />
                <span className="truncate">{b.businessName}</span>
              </Link>
            ))}
          </nav>
        </div>
      ) : null}

      {/* Add business */}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <Link
          href="/business-portal/new"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-primary/5 hover:text-primary"
        >
          <FiPlus className="shrink-0 text-base" />
          {t("addBusiness")}
        </Link>
      </div>
    </aside>
  );
}
