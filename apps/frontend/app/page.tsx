import HeroSection from "@/features/home/HeroSection";
import CategoriesSection from "@/features/home/CategoriesSection";
import LatestBusinessesSection from "@/features/home/LatestBusinessesSection";
import CitiesSection from "@/features/home/CitiesSection";
import Footer from "@/components/layout/Footer";
import { fetchDirectoryCategories, fetchDirectoryCities } from "@/lib/api";
import { getLocale } from "next-intl/server";
import { isAppLocale } from "@/i18n/config";
import { JsonLd } from "@/components/seo/JsonLd";

export default async function HomePage() {
  const requestedLocale = await getLocale();
  const locale = isAppLocale(requestedLocale) ? requestedLocale : "de";
  const [categories, cities] = await Promise.all([
    fetchDirectoryCategories(locale),
    fetchDirectoryCities(locale),
  ]);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Fargo",
          url: process.env.NEXT_PUBLIC_APP_URL || "https://fargo.de",
          potentialAction: {
            "@type": "SearchAction",
            target: `${process.env.NEXT_PUBLIC_APP_URL || "https://fargo.de"}/businesses?search={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <HeroSection categories={categories} cities={cities} />
      <CitiesSection cities={cities} />
      <CategoriesSection />
      <LatestBusinessesSection />
      <Footer />
    </>
  );
}
