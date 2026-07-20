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
  const fallbackOrder = [...new Set<ContentLocale>([requestedLocale, "DE", "EN", "FA", business.sourceLocale])];
  const orderedTranslations = fallbackOrder
    .map((fallbackLocale) => business.translations?.find((translation) => translation.locale === fallbackLocale))
    .filter((translation): translation is TranslationRecord => Boolean(translation));
  const firstText = (field: "businessName" | "shortDescription" | "description") =>
    orderedTranslations.map((translation) => translation[field]).find((content) => content !== null && content !== "");

  return {
    businessName: firstText("businessName") ?? business.businessName,
    shortDescription: firstText("shortDescription") ?? business.shortDescription,
    description: firstText("description") ?? business.description,
  };
}
