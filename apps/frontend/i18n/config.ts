export const appLocales = ["de", "en", "fa"] as const;

export type AppLocale = (typeof appLocales)[number];

export const defaultLocale: AppLocale = "de";
export const localeStorageKey = "woyab-locale";
export const localeCookieName = "WOYAB_LOCALE";
export const localeCookieMaxAge = 60 * 60 * 24 * 365;
export const localeHeaderName = "x-woyab-locale";

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

export function getLocaleFromPathname(pathname: string) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const [candidate] = normalized.slice(1).split("/", 1);
  return isAppLocale(candidate) ? candidate : null;
}

export function stripLocalePrefix(pathname: string) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const locale = getLocaleFromPathname(normalized);

  if (!locale) return normalized;

  const withoutLocale = normalized.slice(locale.length + 1);
  return withoutLocale ? (withoutLocale.startsWith("/") ? withoutLocale : `/${withoutLocale}`) : "/";
}

export function localizePathname(pathname: string, locale: AppLocale) {
  if (!pathname) return `/${locale}`;
  if (/^(https?:)?\/\//.test(pathname) || pathname.startsWith("mailto:") || pathname.startsWith("tel:")) {
    return pathname;
  }

  const url = new URL(pathname.startsWith("/") ? pathname : `/${pathname}`, "http://woyab.local");
  const localizedPath = stripLocalePrefix(url.pathname);

  return `/${locale}${localizedPath === "/" ? "" : localizedPath}${url.search}${url.hash}`;
}
