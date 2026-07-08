"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import GermanyFlag from "country-flag-icons/react/3x2/DE";
import UnitedKingdomFlag from "country-flag-icons/react/3x2/GB";
import ItalyFlag from "country-flag-icons/react/3x2/IT";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import {
  appLocales,
  getDirection,
  isAppLocale,
  localeCookieMaxAge,
  localeCookieName,
  localeLabels,
  localizePathname,
  localeStorageKey,
  type AppLocale,
} from "@/i18n/config";
import { cn } from "@/lib/utils";

type LanguageSelectorProps = {
  align?: "start" | "end";
  triggerClassName?: string;
  menuClassName?: string;
};

const localeFlags = {
  de: GermanyFlag,
  en: UnitedKingdomFlag,
  fa: ItalyFlag,
} satisfies Record<AppLocale, typeof GermanyFlag>;

function LanguageFlag({ locale }: { locale: AppLocale }) {
  const Flag = localeFlags[locale];

  return (
    <span
      aria-hidden="true"
      className="relative h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] shadow-sm"
    >
      <Flag
        className="absolute inset-0 h-full w-full"
        style={
          locale === "fa"
            ? { transform: "rotate(90deg) scale(0.7, 1.4286)" }
            : undefined
        }
      />
    </span>
  );
}

function persistLocale(nextLocale: AppLocale) {
  localStorage.setItem(localeStorageKey, nextLocale);
  document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=${localeCookieMaxAge}; SameSite=Lax`;
  document.documentElement.lang = nextLocale;
  document.documentElement.dir = getDirection(nextLocale);
}

export function LanguageSelector({
  align = "end",
  triggerClassName,
  menuClassName,
}: LanguageSelectorProps) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLocale = isAppLocale(locale) ? locale : "de";
  const [switchingLocale, setSwitchingLocale] = useState<AppLocale | null>(null);
  const effectiveLocale = switchingLocale ?? activeLocale;
  const isPersian = effectiveLocale === "fa";

  const handleChange = (nextLocale: AppLocale) => {
    if (!isAppLocale(locale) || nextLocale === locale || switchingLocale) return;

    setSwitchingLocale(nextLocale);
    persistLocale(nextLocale);

    const search = searchParams.toString();
    const nextPathname = localizePathname(`${pathname}${search ? `?${search}` : ""}`, nextLocale);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.location.assign(nextPathname);
      });
    });
  };

  return (
    <>
      {switchingLocale
        ? createPortal(
          <div className={cn("fixed inset-0 z-[1000] bg-slate-950/45 backdrop-blur-sm", isPersian && "font-dirooz")}>
            <div className="absolute left-1/2 top-1/2 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 px-4">
              <div className="rounded-3xl bg-white p-6 text-center shadow-[0_25px_80px_rgba(15,23,42,.35)]">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
                <p className="mt-4 text-base font-black text-slate-950">{t("switchingTitle")}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{t("switchingDescription")}</p>
              </div>
            </div>
          </div>,
          document.body,
        )
        : null}
      <div className={cn("dropdown", align === "end" && "dropdown-end", isPersian && "font-dirooz")}>
        <div tabIndex={0} role="button">
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-bold text-gray-600 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-60",
            triggerClassName,
          )}
          aria-label={t("label")}
          disabled={Boolean(switchingLocale)}
        >
          <LanguageFlag locale={activeLocale} />
          {localeLabels[activeLocale]}
          <FiChevronDown className="text-xs opacity-70" />
        </button>
        </div>
        <ul
          tabIndex={0}
          className={cn(
            "dropdown-content z-50 mt-2 w-44 rounded-xl border border-gray-100 bg-white p-2 shadow-xl",
            menuClassName,
          )}
        >
          {appLocales.map((item) => {
            const isActive = item === locale;

            return (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => handleChange(item)}
                  disabled={Boolean(switchingLocale)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex items-center gap-2">
                    <LanguageFlag locale={item} />
                    <span>{t(`options.${item}`)}</span>
                  </span>
                  {isActive ? <FiCheck className="text-primary" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
