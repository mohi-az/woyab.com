import type { Metadata } from "next";
import HeroSection from "@/features/home/HeroSection";
import CategoriesSection from "@/features/home/CategoriesSection";
import LatestBusinessesSection from "@/features/home/LatestBusinessesSection";
import CitiesSection from "@/features/home/CitiesSection";
import Footer from "@/components/layout/Footer";
import { getLocale, getTranslations } from "next-intl/server";
import { isAppLocale } from "@/i18n/config";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchHomeData } from "@/lib/home-data";
import { appLocale as toAppLocale, localizedUrl, publicMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Home")]);
  return publicMetadata({
    locale: toAppLocale(locale),
    title: t("hero.title"),
    description: t("hero.description"),
  });
}

export default async function HomePage() {
  const requestedLocale = await getLocale();
  const locale = isAppLocale(requestedLocale) ? requestedLocale : "de";
  const { categories, cities, latestBusinesses } = await fetchHomeData(locale);
  const categoryCounts = Object.fromEntries(
    categories.map((category) => [category.id, category.count ?? 0]),
  );

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "WoYab",
          url: localizedUrl(locale),
          potentialAction: {
            "@type": "SearchAction",
            target: `${localizedUrl(locale, "/businesses")}?search={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <HeroSection categories={categories} cities={cities} />
      <CitiesSection cities={cities} />
      <CategoriesSection counts={categoryCounts} />
      <LatestBusinessesSection items={latestBusinesses} />
      <Footer />
    </>
  );
}
