"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  getDirection,
  isAppLocale,
  localeCookieMaxAge,
  localeCookieName,
  localeStorageKey,
  type AppLocale,
} from "@/i18n/config";

function persistLocale(locale: AppLocale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = getDirection(locale);
  localStorage.setItem(localeStorageKey, locale);
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=${localeCookieMaxAge}; SameSite=Lax`;
}

export function LocaleObserver() {
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (!isAppLocale(locale)) return;

    const storedLocale = localStorage.getItem(localeStorageKey);

    if (isAppLocale(storedLocale) && storedLocale !== locale) {
      persistLocale(storedLocale);
      router.refresh();
      return;
    }

    persistLocale(locale);
  }, [locale, router]);

  return null;
}
