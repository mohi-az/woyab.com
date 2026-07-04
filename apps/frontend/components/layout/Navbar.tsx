"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FiGrid, FiLogIn, FiLogOut, FiMenu, FiUserPlus, FiX } from "react-icons/fi";
import { FaClipboardList } from "react-icons/fa";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { NAV_LINKS } from "@/constants";
import { stripLocalePrefix } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = useTranslations("Navbar");
  const locale = useLocale();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const internalPathname = stripLocalePrefix(pathname);
  const hasHeroOverlay =
    internalPathname === "/" ||
    internalPathname === "/businesses" ||
    internalPathname.startsWith("/businesses/");
  const isSolid = scrolled || mobileOpen;
  const isOverlay = hasHeroOverlay && !isSolid;

  useEffect(() => {
    const syncScrolled = () => setScrolled(window.scrollY > 12);

    syncScrolled();
    window.addEventListener("scroll", syncScrolled, { passive: true });

    return () => window.removeEventListener("scroll", syncScrolled);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const headerClassName = cn(
    "fixed inset-x-0 top-0 z-50 transition-all duration-300",
    isSolid
      ? "border-b border-slate-200/80 bg-white/92 shadow-[0_6px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl"
      : "border-b border-transparent bg-transparent shadow-none backdrop-blur-0",
  );
  const brandTextClassName = isOverlay ? "text-white" : "text-slate-950";
  const navItemClassName = (active: boolean) =>
    cn(
      "relative py-2.5 text-sm font-bold transition-colors",
      active
        ? isOverlay
          ? "text-white"
          : "text-primary"
        : isOverlay
          ? "text-white/78 hover:text-white"
          : "text-slate-700 hover:text-primary",
    );
  const languageTriggerClassName = cn(
    "h-10 rounded-full border px-3 text-sm shadow-none transition-colors",
    isOverlay
      ? "border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
      : "border-slate-200 bg-white text-slate-600 hover:border-primary/20 hover:bg-primary/5 hover:text-primary",
  );
  const secondaryActionClassName = cn(
    "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-all",
    isOverlay
      ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
      : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-primary/25 hover:text-primary",
  );
  const primaryActionClassName = cn(
    "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition-all",
    isOverlay
      ? "bg-white text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.18)] hover:bg-orange-50"
      : "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] hover:bg-slate-800",
  );
  const authLinkClassName = isOverlay ? "text-white/80 hover:text-white" : "text-slate-700 hover:text-primary";

  return (
    <header className={headerClassName}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between lg:h-[4.75rem]">
          <Link href="/" className="flex flex-shrink-0 items-center gap-3" aria-label="Fargo">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg text-white shadow-[0_9px_22px_rgba(241,91,63,0.28)]">
              <FaClipboardList />
            </span>
            <span className={cn("text-2xl font-black tracking-tight transition-colors", brandTextClassName)}>Fargo</span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label={t("navigationLabel")}>
            {NAV_LINKS.map((link) => {
              const active = link.href === "/" ? internalPathname === "/" : internalPathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={navItemClassName(active)}
                >
                  {t(`nav.${link.labelKey}`)}
                  <span
                    className={cn(
                      "absolute inset-x-0 -bottom-0.5 mx-auto h-0.5 rounded-full bg-primary transition-all",
                      active ? "w-full" : "w-0",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSelector triggerClassName={languageTriggerClassName} />
            {status !== "loading" &&
              (session?.user ? (
                <>
                  <Link href="/dashboard" className={secondaryActionClassName}>
                    <FiGrid className="text-base" />
                    {t("auth.dashboard")}
                  </Link>
                  <button
                    onClick={() => signOut({ redirectTo: `/${locale}` })}
                    className={primaryActionClassName}
                  >
                    <FiLogOut className="text-base" />
                    {t("auth.logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className={cn("inline-flex items-center gap-2 text-sm font-bold transition-colors", authLinkClassName)}>
                    <FiLogIn className="text-base" />
                    {t("auth.login")}
                  </Link>
                  <Link
                    href="/register"
                    className={secondaryActionClassName}
                  >
                    <FiUserPlus className="text-base" />
                    {t("auth.register")}
                  </Link>
                </>
              ))}
          </div>

          <button
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors lg:hidden",
              isOverlay
                ? "border-white/15 bg-white/10 text-white"
                : "border-slate-200 bg-white text-slate-800 shadow-sm",
            )}
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={t("toggleNavigation")}
          >
            {mobileOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="border-t border-slate-200/70 py-4 lg:hidden" aria-label={t("navigationLabel")}>
            <div className="flex flex-col gap-1.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-xl px-4 py-3 font-bold text-slate-700 hover:bg-primary/5 hover:text-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="font-medium">{t(`nav.${link.labelKey}`)}</span>
                </Link>
              ))}
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="mb-3 flex flex-wrap gap-3 px-4">
                {session?.user ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 font-bold text-slate-700"
                    >
                      <FiGrid className="text-base" />
                      {t("auth.dashboard")}
                    </Link>
                    <button
                      onClick={() => signOut({ redirectTo: `/${locale}` })}
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-950 px-4 font-bold text-white"
                    >
                      <FiLogOut className="text-base" />
                      {t("auth.logout")}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileOpen(false)} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 font-bold text-slate-700">
                      <FiLogIn className="text-base" />
                      {t("auth.login")}
                    </Link>
                    <Link href="/register" onClick={() => setMobileOpen(false)} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 font-bold text-slate-700">
                      <FiUserPlus className="text-base" />
                      {t("auth.register")}
                    </Link>
                  </>
                )}
              </div>
              <div className={`flex ${locale === "fa" ? "justify-end" : "justify-start"}`}>
                <LanguageSelector
                  align="start"
                  triggerClassName="h-10 rounded-full border border-slate-200 bg-white px-3 text-slate-600"
                />
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
