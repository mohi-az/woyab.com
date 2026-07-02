"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FiArrowRight, FiMenu, FiX } from "react-icons/fi";
import { FaClipboardList } from "react-icons/fa";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { NAV_LINKS } from "@/constants";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("Navbar");
  const locale = useLocale();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 shadow-[0_6px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-18 items-center justify-between lg:h-22">
          <Link href="/" className="flex flex-shrink-0 items-center gap-3" aria-label="Fargo">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg text-white shadow-[0_9px_22px_rgba(241,91,63,0.28)]">
              <FaClipboardList />
            </span>
            <span className="text-2xl font-black tracking-tight text-slate-950">Fargo</span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label={t("navigationLabel")}>
            {NAV_LINKS.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative py-3 text-sm font-bold transition-colors ${active ? "text-primary" : "text-slate-700 hover:text-primary"}`}
                >
                  {t(`nav.${link.labelKey}`)}
                  <span
                    className={`absolute inset-x-0 -bottom-0.5 mx-auto h-0.5 rounded-full bg-primary transition-all ${active ? "w-full" : "w-0"}`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSelector />
            {status !== "loading" &&
              (session?.user ? (
                <>
                  <Link href="/dashboard" className="text-sm font-bold text-slate-700 hover:text-primary">
                    {t("auth.dashboard")}
                  </Link>
                  <button
                    onClick={() => signOut({ redirectTo: "/" })}
                    className="text-sm font-bold text-slate-500 hover:text-primary"
                  >
                    {t("auth.logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-bold text-slate-700 hover:text-primary">
                    {t("auth.login")}
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-primary hover:text-primary"
                  >
                    {t("auth.register")}
                  </Link>
                </>
              ))}
            <Link
              href="/businesses"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(241,91,63,0.25)] transition hover:-translate-y-0.5 hover:bg-primary-dark"
            >
              {t("explore")} <FiArrowRight className="rtl:rotate-180" />
            </Link>
          </div>

          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-800 lg:hidden"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={t("toggleNavigation")}
          >
            {mobileOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="border-t border-slate-100 py-4 lg:hidden" aria-label={t("navigationLabel")}>
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
              <div className="mb-3 flex gap-3 px-4">
                {session?.user ? (
                  <>
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="font-bold text-primary">
                      {t("auth.dashboard")}
                    </Link>
                    <button onClick={() => signOut({ redirectTo: "/" })} className="font-bold text-slate-500">
                      {t("auth.logout")}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileOpen(false)} className="font-bold text-primary">
                      {t("auth.login")}
                    </Link>
                    <Link href="/register" onClick={() => setMobileOpen(false)} className="font-bold text-slate-600">
                      {t("auth.register")}
                    </Link>
                  </>
                )}
              </div>
              <div className={`flex ${locale === "fa" ? "justify-end" : "justify-start"}`}>
                <LanguageSelector align="start" />
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
