"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (!isAppLocale(locale)) return;

    persistLocale(locale);
  }, [locale]);

  return null;
}
