export const appLocales = ["de", "en", "fa"] as const;

export type AppLocale = (typeof appLocales)[number];

export const defaultLocale: AppLocale = "de";
export const localeStorageKey = "fargo-locale";
export const localeCookieName = "FARGO_LOCALE";
export const localeCookieMaxAge = 60 * 60 * 24 * 365;

export const localeLabels: Record<AppLocale, string> = {
  de: "Deutsch",
  en: "English",
  fa: "فارسی",
};

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value !== null && value !== undefined && appLocales.includes(value as AppLocale);
}

export function getDirection(locale: AppLocale) {
  return locale === "fa" ? "rtl" : "ltr";
}
