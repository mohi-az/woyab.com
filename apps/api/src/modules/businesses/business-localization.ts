import type { ContentLocale, Prisma } from "@fargo/database";
import type { AppLocale } from "@fargo/shared";

const appToDbLocaleMap: Record<AppLocale, ContentLocale> = {
  de: "DE",
  en: "EN",
  fa: "FA",
};

const dbToAppLocaleMap: Record<ContentLocale, AppLocale> = {
  DE: "de",
  EN: "en",
  FA: "fa",
};

const persianTextPattern = /[\u0600-\u06FF]/;

export const businessTranslationSelect = {
  locale: true,
  businessName: true,
  shortDescription: true,
  description: true,
} satisfies Prisma.BusinessTranslationSelect;

type TranslationRecord = {
  locale: ContentLocale;
  businessName: string;
  shortDescription: string | null;
  description: string | null;
};

type LocalizableBusiness = {
  sourceLocale: ContentLocale;
  businessName: string;
  shortDescription: string | null;
  description: string | null;
  translations?: TranslationRecord[];
};

export type BusinessTranslationInput = {
  locale: AppLocale;
  businessName: string;
  shortDescription?: string | null;
  description?: string | null;
};

export function appLocaleToContentLocale(locale: AppLocale): ContentLocale {
  return appToDbLocaleMap[locale];
}

export function contentLocaleToAppLocale(locale: ContentLocale): AppLocale {
  return dbToAppLocaleMap[locale];
}

export function inferBusinessLocale(input: {
  businessName?: string | null;
  shortDescription?: string | null;
  description?: string | null;
}): AppLocale {
  const sample = `${input.businessName ?? ""}\n${input.shortDescription ?? ""}\n${input.description ?? ""}`;
  return persianTextPattern.test(sample) ? "fa" : "de";
}

export function localizeBusiness<T extends LocalizableBusiness>(business: T, locale: AppLocale) {
  const requestedLocale = appLocaleToContentLocale(locale);
  const requested = business.translations?.find((translation) => translation.locale === requestedLocale);
  const source = business.translations?.find((translation) => translation.locale === business.sourceLocale);
  const effective = requested ?? source;

  return {
    ...business,
    businessName: requested?.businessName ?? source?.businessName ?? business.businessName,
    shortDescription: requested?.shortDescription ?? source?.shortDescription ?? business.shortDescription,
    description: requested?.description ?? source?.description ?? business.description,
    contentLocale: contentLocaleToAppLocale(effective?.locale ?? business.sourceLocale),
    isFallback: requested?.locale !== requestedLocale,
  };
}
