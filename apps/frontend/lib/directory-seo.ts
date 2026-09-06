import type { AppLocale } from "@/i18n/config";

export type DirectoryTopic = {
  path: string;
  kind: "cities" | "categories" | "specialties";
  nameFa: string;
  nameEn: string;
  nameDe?: string | null;
  city?: { nameFa: string; nameEn: string };
  cityId?: number;
  categoryId?: number;
  subCategoryId?: number;
  count: number;
};

export const directoryCopy = {
  fa: {
    title: "راهنمای کسب‌وکارهای فارسی‌زبان در آلمان",
    description: "پزشک، رستوران، فروشگاه و خدمات فارسی‌زبان در آلمان را بر اساس شهر و تخصص پیدا کنید. آدرس و اطلاعات تماس کسب‌وکارهای ایرانی و افغانستانی را ببینید.",
    cities: "شهرها", categories: "دسته‌بندی خدمات", specialties: "تخصص‌ها",
    results: "کسب‌وکارهای این فهرست", details: "مشاهده اطلاعات و راه‌های تماس",
    related: "جستجوهای مرتبط", filter: "جستجو روی نقشه و فیلتر نتایج",
    previous: "صفحه قبل", next: "صفحه بعد", page: "صفحه", home: "خانه",
    guideTitle: "پیش از انتخاب، اطلاعات کسب‌وکار را بررسی کنید",
    guide: "آدرس و راه‌های تماس را در صفحه هر کسب‌وکار ببینید. پیش از مراجعه، ساعت کاری، زبان ارائه خدمات و امکان رزرو را مستقیماً تأیید کنید. برای انتخاب دقیق‌تر، شهر و تخصص موردنیازتان را مشخص کنید.",
  },
  de: {
    title: "Persischsprachige Unternehmen in Deutschland finden",
    description: "Ärzte, Restaurants, Geschäfte und persischsprachige Dienstleistungen in Deutschland nach Stadt und Fachgebiet finden. Adressen und Kontakte iranischer und afghanischer Unternehmen.",
    cities: "Städte", categories: "Branchen", specialties: "Fachgebiete",
    results: "Unternehmen in diesem Verzeichnis", details: "Profil und Kontaktdaten ansehen",
    related: "Verwandte Verzeichnisse", filter: "Auf der Karte suchen und Ergebnisse filtern",
    previous: "Vorherige Seite", next: "Nächste Seite", page: "Seite", home: "Startseite",
    guideTitle: "Angaben vor dem Besuch prüfen",
    guide: "Öffnen Sie die Profile für Adressen und Kontaktmöglichkeiten. Bestätigen Sie Öffnungszeiten, Beratungssprache und Terminverfügbarkeit direkt beim Unternehmen. Grenzen Sie Ihre Auswahl nach Stadt und Fachgebiet ein.",
  },
  en: {
    title: "Find Persian-speaking businesses in Germany",
    description: "Find doctors, restaurants, shops and Persian-speaking services in Germany by city and specialty. Browse addresses and contact details for Iranian and Afghan businesses.",
    cities: "Cities", categories: "Categories", specialties: "Specialties",
    results: "Businesses in this directory", details: "View profile and contact details",
    related: "Related directories", filter: "Search on the map and filter results",
    previous: "Previous page", next: "Next page", page: "Page", home: "Home",
    guideTitle: "Check the details before choosing",
    guide: "Open each profile for its address and contact details. Confirm opening hours, service language and appointment availability directly with the business before visiting. Narrow your options by city and specialty.",
  },
} satisfies Record<AppLocale, Record<string, string>>;

export function topicName(topic: Pick<DirectoryTopic, "nameFa" | "nameEn" | "nameDe">, locale: AppLocale) {
  return locale === "fa" ? topic.nameFa : locale === "de" ? topic.nameDe || topic.nameEn : topic.nameEn;
}

export function topicTitle(topic: DirectoryTopic, locale: AppLocale) {
  const name = topicName(topic, locale);
  const city = topic.city ? topicName(topic.city, locale) : null;
  if (topic.kind === "cities") {
    return locale === "fa" ? `کسب‌وکارهای فارسی‌زبان در ${name}`
      : locale === "de" ? `Persischsprachige Unternehmen in ${name}` : `Persian-speaking businesses in ${name}`;
  }
  return locale === "fa" ? `${name} فارسی‌زبان در ${city || "آلمان"}`
    : locale === "de" ? `${name} in ${city || "Deutschland"} – persischsprachig`
      : `${name} in ${city || "Germany"} – Persian-speaking`;
}

export function topicDescription(topic: DirectoryTopic, locale: AppLocale) {
  const title = topicTitle(topic, locale);
  const count = new Intl.NumberFormat(locale).format(topic.count);
  return locale === "fa" ? `${title}: ${count} کسب‌وکار در WoYab. آدرس، اطلاعات تماس و جزئیات خدمات را ببینید و گزینه‌های مرتبط را بررسی کنید.`
    : locale === "de" ? `${title}: ${count} Einträge auf WoYab. Adressen, Kontaktdaten und Leistungsbeschreibungen ansehen und passende Anbieter finden.`
      : `${title}: ${count} listings on WoYab. Browse addresses, contact details and service descriptions to find relevant businesses.`;
}

export function directoryPage(value: string | string[] | undefined) {
  if (value === undefined) return 1;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) && page <= 100000 ? page : null;
}

export function paginatedPath(path: string, page: number) {
  return page === 1 ? path : `${path}?page=${page}`;
}

export function serializeJsonLd(data: Record<string, unknown>) {
  // User-supplied business text must never terminate the script element.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
