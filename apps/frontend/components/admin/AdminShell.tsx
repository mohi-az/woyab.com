"use client";

import { ConfigProvider, theme as antTheme } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  FiActivity,
  FiBarChart2,
  FiBriefcase,
  FiCheckSquare,
  FiFlag,
  FiGrid,
  FiInbox,
  FiMenu,
  FiMessageSquare,
  FiMoon,
  FiSettings,
  FiShield,
  FiTrash2,
  FiSun,
  FiTag,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type AdminUser = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: string;
};

const navItems = [
  { href: "/admin", key: "overview", icon: FiGrid },
  { href: "/admin/analytics", key: "analytics", icon: FiBarChart2 },
  { href: "/admin/businesses", key: "businesses", icon: FiBriefcase },
  { href: "/admin/reviews", key: "reviews", icon: FiCheckSquare },
  { href: "/admin/users", key: "users", icon: FiUsers },
  { href: "/admin/owners", key: "owners", icon: FiUserCheck },
  { href: "/admin/taxonomy", key: "taxonomy", icon: FiTag },
  { href: "/admin/reports", key: "reports", icon: FiFlag },
  { href: "/admin/claims", key: "claims", icon: FiShield },
  { href: "/admin/change-requests", key: "changeRequests", icon: FiCheckSquare },
  { href: "/admin/retention", key: "retention", icon: FiTrash2 },
  { href: "/admin/messages", key: "messages", icon: FiInbox },
  { href: "/admin/tickets", key: "tickets", icon: FiMessageSquare },
  { href: "/admin/settings", key: "settings", icon: FiSettings },
  { href: "/admin/audit", key: "audit", icon: FiActivity },
] as const;

const superAdminOnlyPaths = new Set([
  "/admin/audit",
  "/admin/retention",
  "/admin/settings",
]);

function normalizePath(pathname: string) {
  return pathname.replace(/^\/(de|en|fa)(?=\/|$)/, "") || "/";
}

export function AdminShell({ user, children, initialTheme }: {
  user: AdminUser;
  children: React.ReactNode;
  initialTheme: "dark" | "light";
}) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(initialTheme === "dark");

  useEffect(() => {
    document.body.setAttribute("data-admin-theme", dark ? "dark" : "light");
  }, [dark]);
  const normalizedPath = normalizePath(pathname);
  const displayName = user.name || user.email || t("shell.fallbackName");
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <ConfigProvider
      direction={locale === "fa" ? "rtl" : "ltr"}
      theme={{
        algorithm: dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorBgContainer: dark ? "#171d31" : "#ffffff",
          colorBgElevated: dark ? "#20283d" : "#ffffff",
          colorBorder: dark ? "rgba(255, 255, 255, 0.10)" : "#cbd5e1",
          colorText: dark ? "#ffffff" : "#0f172a",
          colorTextPlaceholder: dark ? "#94a3b8" : "#64748b",
        },
      }}
    >
      <div data-admin-theme={dark ? "dark" : "light"} className="admin-shell fixed inset-0 z-[60] overflow-hidden">
      <aside
        className={cn(
          "admin-sidebar fixed inset-y-0 z-40 flex w-[298px] flex-col border-r shadow-2xl transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "rtl:translate-x-full rtl:lg:translate-x-0",
          sidebarOpen && "rtl:translate-x-0",
        )}
      >
        <div className="admin-sidebar-border flex h-[70px] items-center justify-between border-b px-5">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="admin-brand-icon grid h-10 w-10 place-items-center rounded-lg border">
              <FiBarChart2 className="h-5 w-5" />
            </span>
            <span className="admin-brand text-2xl font-black tracking-wide">Fargo</span>
          </Link>
          <button type="button" className="admin-icon-button rounded-lg p-2 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label={t("shell.closeMenu")}>
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="admin-sidebar-border border-b px-4 py-5">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <span
                aria-label={displayName}
                className="h-12 w-12 rounded-full bg-cover bg-center ring-2 ring-sky-400/30"
                style={{ backgroundImage: `url(${user.avatarUrl})` }}
              />
            ) : (
              <span className="admin-avatar-fallback grid h-12 w-12 place-items-center rounded-full text-lg font-black">{initials}</span>
            )}
            <div className="min-w-0">
              <p className="admin-title truncate font-bold">{displayName}</p>
              <p className="admin-muted mt-1 text-xs font-bold uppercase tracking-wide">{user.role}</p>
            </div>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          <div className="grid gap-1">
            {navItems.filter((item) => user.role === "SUPER_ADMIN" || !superAdminOnlyPaths.has(item.href)).map((item) => {
              const Icon = item.icon;
              const active = item.href === "/admin"
                ? normalizedPath === "/admin"
                : normalizedPath.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "admin-nav-link flex min-h-12 items-center gap-3 rounded-lg px-4 text-sm font-bold transition",
                    active && "admin-nav-link-active",
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{t(`nav.${item.key}`)}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {sidebarOpen ? <button type="button" className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label={t("shell.closeMenu")} /> : null}

      <div className="flex h-full min-w-0 flex-col lg:ps-[298px]">
        <header className="admin-topbar flex h-[70px] shrink-0 items-center justify-between border-b px-4 shadow-lg sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" className="admin-icon-button rounded-lg p-2 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label={t("shell.openMenu")}>
              <FiMenu className="h-6 w-6" />
            </button>
            <div>
              <p className="admin-muted text-xs font-bold uppercase tracking-[0.22em]">{t("shell.ownerPanel")}</p>
              <h1 className="admin-title text-lg font-black sm:text-xl">{t("shell.title")}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="admin-icon-button grid h-11 w-11 place-items-center rounded-full border"
              onClick={() => setDark((current) => {
                const next = !current;
                document.cookie = `fargo-admin-theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
                return next;
              })}
              aria-label={dark ? t("shell.lightMode") : t("shell.darkMode")}
            >
              {dark ? <FiSun className="h-5 w-5" /> : <FiMoon className="h-5 w-5" />}
            </button>
            <Link href="/dashboard" className="admin-secondary-link rounded-lg border px-4 py-2 text-sm font-bold">
              {t("shell.exit")}
            </Link>
          </div>
        </header>

        <main className="admin-main min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1540px]">{children}</div>
        </main>
      </div>
      </div>
    </ConfigProvider>
  );
}
