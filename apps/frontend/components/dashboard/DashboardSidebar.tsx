"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FiAlertCircle, FiBriefcase, FiGrid, FiHeart, FiLock, FiMapPin, FiStar, FiUser } from "react-icons/fi";
import { Link } from "@/i18n/navigation";
import { stripLocalePrefix } from "@/i18n/config";
import { cn } from "@/lib/utils";

type DashboardUser = {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: "USER" | "OWNER" | "ADMIN" | "SUPER_ADMIN";
  hasBusinesses: boolean;
};

const links = [
  { href: "/dashboard", labelKey: "overview", icon: FiGrid, exact: true },
  { href: "/dashboard/profile", labelKey: "profile", icon: FiUser, exact: false },
  { href: "/dashboard/favorites", labelKey: "favorites", icon: FiHeart, exact: false },
  { href: "/dashboard/addresses", labelKey: "addresses", icon: FiMapPin, exact: false },
  { href: "/dashboard/reviews", labelKey: "reviews", icon: FiStar, exact: false },
  { href: "/dashboard/reports", labelKey: "reports", icon: FiAlertCircle, exact: false },
  { href: "/dashboard/security", labelKey: "security", icon: FiLock, exact: false },
] as const;

export function DashboardSidebar({ initialUser }: { initialUser: DashboardUser }) {
  const t = useTranslations("Dashboard.sidebar");
  const pathname = usePathname();
  const internal = stripLocalePrefix(pathname);
  const [user, setUser] = useState(initialUser);
  const displayName = user.name || t("fallbackName");
  const initials = displayName.trim().slice(0, 1).toUpperCase();
  const hasOwnerAccess =
    user.role === "OWNER" ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.hasBusinesses;

  useEffect(() => {
    function updateAvatar(event: Event) {
      const detail = (event as CustomEvent<Partial<DashboardUser>>).detail;
      setUser((current) => ({ ...current, ...detail }));
    }
    window.addEventListener("fargo:profile-updated", updateAvatar);
    return () => window.removeEventListener("fargo:profile-updated", updateAvatar);
  }, []);

  const isActive = (href: string, exact: boolean) =>
    exact ? internal === href : internal.startsWith(href);

  return (
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-28">
      <div className="flex items-center gap-3 border-b border-slate-100 px-1 pb-4">
        {user.avatarUrl ? (
          <span
            aria-label={displayName}
            className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center ring-2 ring-primary/15"
            style={{ backgroundImage: `url(${user.avatarUrl})` }}
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-black text-primary">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-black text-slate-950">{displayName}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
        </div>
      </div>
      <nav className="mt-3 space-y-0.5">
        {links.map(({ href, labelKey, icon: Icon, exact }) => {
          const active = isActive(href, exact);
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
              <Icon className="shrink-0 text-base" />
              {t(labelKey)}
            </Link>
          );
        })}
        {hasOwnerAccess ? (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <Link
              href="/business-portal"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-primary/5 hover:text-primary"
            >
              <FiBriefcase className="shrink-0 text-base" />
              {t("owner")}
            </Link>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
