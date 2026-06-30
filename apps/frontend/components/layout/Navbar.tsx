"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { FiChevronDown, FiMenu, FiUser, FiX } from "react-icons/fi";
import { FaClipboardList } from "react-icons/fa";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { Button } from "@/components/ui/Button";
import { NAV_LINKS } from "@/constants";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("Navbar");
  const locale = useLocale();
  const isRTL = locale === "fa";

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between lg:h-20">
          <Link href="/" className="flex flex-shrink-0 items-center gap-2">
            <FaClipboardList className="text-2xl text-primary" />
            <span className="text-xl font-bold tracking-tight text-primary">Fargo</span>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
            {NAV_LINKS.map((link) =>
              link.hasDropdown ? (
                <div key={link.href} className="dropdown dropdown-hover">
                  <div
                    tabIndex={0}
                    role="button"
                    className="btn btn-ghost btn-sm font-medium text-gray-700 hover:bg-primary/5 hover:text-primary"
                  >
                    {t(`nav.${link.labelKey}`)}
                    <FiChevronDown className="text-xs opacity-60" />
                  </div>
                  <ul
                    tabIndex={0}
                    className={cn(
                      "dropdown-content z-50 menu mt-1 w-48 rounded-xl border border-gray-100 bg-white p-2 shadow-xl",
                      isRTL && "text-right",
                    )}
                  >
                    {link.children?.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className="rounded-lg text-gray-700 hover:bg-primary/5 hover:text-primary"
                        >
                          {t(`nav.${child.labelKey}`)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="btn btn-ghost btn-sm font-medium text-gray-700 hover:bg-primary/5 hover:text-primary"
                >
                  {t(`nav.${link.labelKey}`)}
                </Link>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSelector />

            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button">
                <Button variant="outlined" size="sm" className="gap-1.5 rounded-full border-primary px-5">
                  <FiUser className="text-sm" />
                  {t("actions.user")}
                  <FiChevronDown className="text-xs opacity-70" />
                </Button>
              </div>
              <ul
                tabIndex={0}
                className={cn(
                  "dropdown-content z-50 menu mt-2 w-48 rounded-xl border border-gray-100 bg-white p-2 shadow-xl",
                  isRTL && "text-right",
                )}
              >
                <li><Link href="/login" className="rounded-lg hover:text-primary">{t("userMenu.login")}</Link></li>
                <li><Link href="/register" className="rounded-lg hover:text-primary">{t("userMenu.register")}</Link></li>
                <li><Link href="/profile" className="rounded-lg hover:text-primary">{t("userMenu.profile")}</Link></li>
              </ul>
            </div>

            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button">
                <Button variant="primary" size="sm" className="gap-1.5 rounded-full px-5">
                  {t("actions.vendor")}
                  <FiChevronDown className="text-xs opacity-80" />
                </Button>
              </div>
              <ul
                tabIndex={0}
                className={cn(
                  "dropdown-content z-50 menu mt-2 w-48 rounded-xl border border-gray-100 bg-white p-2 shadow-xl",
                  isRTL && "text-right",
                )}
              >
                <li><Link href="/vendor/register" className="rounded-lg hover:text-primary">{t("vendorMenu.becomeVendor")}</Link></li>
                <li><Link href="/vendor/login" className="rounded-lg hover:text-primary">{t("vendorMenu.vendorLogin")}</Link></li>
                <li><Link href="/vendor/dashboard" className="rounded-lg hover:text-primary">{t("vendorMenu.dashboard")}</Link></li>
              </ul>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-square btn-sm lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={t("toggleNavigation")}
          >
            {mobileOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="border-t border-gray-100 py-4 lg:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-gray-700 hover:bg-primary/5 hover:text-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="font-medium">{t(`nav.${link.labelKey}`)}</span>
                  {link.hasDropdown ? <FiChevronDown className="text-sm text-gray-400" /> : null}
                </Link>
              ))}
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="mb-3 flex justify-start">
                <LanguageSelector align="start" />
              </div>
              <div className="flex gap-2">
                <Button variant="outlined" size="sm" className="flex-1 rounded-full border-primary">
                  <FiUser className="text-sm" />
                  {t("actions.user")}
                </Button>
                <Button variant="primary" size="sm" className="flex-1 rounded-full">
                  {t("actions.vendor")}
                </Button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
