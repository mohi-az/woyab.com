import HeroSection from "@/features/home/HeroSection";
import CategoriesSection from "@/features/home/CategoriesSection";
import LatestBusinessesSection from "@/features/home/LatestBusinessesSection";
import CitiesSection from "@/features/home/CitiesSection";
import Footer from "@/components/layout/Footer";
import { getLocale } from "next-intl/server";
import { isAppLocale } from "@/i18n/config";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchHomeData } from "@/lib/home-data";

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
          url: process.env.NEXT_PUBLIC_APP_URL || "https://woyab.de",
          potentialAction: {
            "@type": "SearchAction",
            target: `${process.env.NEXT_PUBLIC_APP_URL || "https://woyab.de"}/businesses?search={search_term_string}`,
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
