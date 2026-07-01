"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
  localeStorageKey,
  type AppLocale,
} from "@/i18n/config";
import { cn } from "@/lib/utils";

type LanguageSelectorProps = {
  align?: "start" | "end";
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
}: LanguageSelectorProps) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const activeLocale = isAppLocale(locale) ? locale : "de";

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
          <LanguageFlag locale={activeLocale} />
          {localeLabels[activeLocale]}
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
  );
}
