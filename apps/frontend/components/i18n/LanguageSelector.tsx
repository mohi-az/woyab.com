"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FiCheck, FiChevronDown, FiGlobe } from "react-icons/fi";
import {
  appLocales,
  getDirection,
  isAppLocale,
  localeCookieMaxAge,
  localeCookieName,
  localeLabels,
  localeStorageKey,
  type AppLocale,
} from "@/i18n/config";
import { cn } from "@/lib/utils";

type LanguageSelectorProps = {
  align?: "start" | "end";
};

function persistLocale(nextLocale: AppLocale) {
  localStorage.setItem(localeStorageKey, nextLocale);
  document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=${localeCookieMaxAge}; SameSite=Lax`;
  document.documentElement.lang = nextLocale;
  document.documentElement.dir = getDirection(nextLocale);
}

export function LanguageSelector({
  align = "end",
}: LanguageSelectorProps) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (nextLocale: AppLocale) => {
    if (!isAppLocale(locale) || nextLocale === locale) return;

    persistLocale(nextLocale);

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className={cn("dropdown", align === "end" && "dropdown-end")}>
      <div tabIndex={0} role="button">
        <button
          type="button"
          className="btn btn-ghost btn-sm gap-1.5 font-medium text-gray-600 hover:text-primary"
          aria-label={t("label")}
          disabled={isPending}
        >
          <FiGlobe className="text-base" />
          {isAppLocale(locale) ? localeLabels[locale] : localeLabels.de}
          <FiChevronDown className="text-xs opacity-70" />
        </button>
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content z-50 mt-2 w-44 rounded-xl border border-gray-100 bg-white p-2 shadow-xl"
      >
        {appLocales.map((item) => {
          const isActive = item === locale;

          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => handleChange(item)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary"
              >
                <span>{t(`options.${item}`)}</span>
                {isActive ? <FiCheck className="text-primary" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
