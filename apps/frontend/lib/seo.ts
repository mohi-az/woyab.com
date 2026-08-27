import type { Metadata } from "next";
import { appLocales, type AppLocale } from "@/i18n/config";

const fallbackAppUrl = "https://woyab.de";

const openGraphLocales: Record<AppLocale, string> = {
  de: "de_DE",
  en: "en_US",
  fa: "fa_IR",
};

export function appLocale(value: string | null | undefined): AppLocale {
  return value === "en" || value === "fa" ? value : "de";
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || fallbackAppUrl).replace(/\/$/, "");
}

export function localizedUrl(locale: AppLocale, pathname = "/") {
  const path = pathname === "/" ? "" : pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${appUrl()}/${locale}${path}`;
}

export function absoluteUrl(url: string) {
  return /^https?:\/\//.test(url) ? url : new URL(url, `${appUrl()}/`).toString();
}

export function localizedAlternates(locale: AppLocale, pathname = "/") {
  return {
    canonical: localizedUrl(locale, pathname),
    languages: {
      ...Object.fromEntries(appLocales.map((item) => [item, localizedUrl(item, pathname)])),
      "x-default": localizedUrl("de", pathname),
    },
  };
}

type PublicMetadataOptions = {
  locale: AppLocale;
  pathname?: string;
  title: string;
  description: string;
  image?: string | null;
};

export function publicMetadata({
  locale,
  pathname = "/",
  title,
  description,
  image,
}: PublicMetadataOptions): Metadata {
  const url = localizedUrl(locale, pathname);
  const images = image ? [{ url: image }] : undefined;

  return {
    title,
    description,
    alternates: localizedAlternates(locale, pathname),
    openGraph: {
      type: "website",
      siteName: "WoYab",
      locale: openGraphLocales[locale],
      alternateLocale: appLocales.filter((item) => item !== locale).map((item) => openGraphLocales[item]),
      url,
      title,
      description,
      images,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}
