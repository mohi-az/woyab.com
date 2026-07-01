import type { ContentLocale } from "@fargo/database";
import type { AppLocale } from "@/i18n/config";

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
  description?: string | null;
  translations?: TranslationRecord[];
};

const appToDbLocaleMap: Record<AppLocale, ContentLocale> = {
  de: "DE",
  en: "EN",
  fa: "FA",
};

export function localizeBusinessContent<T extends LocalizableBusiness>(business: T, locale: AppLocale) {
  const requestedLocale = appToDbLocaleMap[locale];
  const requested = business.translations?.find((translation) => translation.locale === requestedLocale);
  const source = business.translations?.find((translation) => translation.locale === business.sourceLocale);

  return {
    businessName: requested?.businessName ?? source?.businessName ?? business.businessName,
    shortDescription: requested?.shortDescription ?? source?.shortDescription ?? business.shortDescription,
    description: requested?.description ?? source?.description ?? business.description,
  };
}
