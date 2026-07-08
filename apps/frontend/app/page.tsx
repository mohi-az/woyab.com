import HeroSection from "@/features/home/HeroSection";
import CategoriesSection from "@/features/home/CategoriesSection";
import LatestBusinessesSection from "@/features/home/LatestBusinessesSection";
import CitiesSection from "@/features/home/CitiesSection";
import Footer from "@/components/layout/Footer";
import { fetchDirectoryCategories, fetchDirectoryCities } from "@/lib/api";
import { getLocale } from "next-intl/server";
import { isAppLocale } from "@/i18n/config";

export default async function HomePage() {
  const requestedLocale = await getLocale();
  const locale = isAppLocale(requestedLocale) ? requestedLocale : "de";
  const [categories, cities] = await Promise.all([
    fetchDirectoryCategories(locale),
    fetchDirectoryCities(locale),
  ]);

  return (
    <>
      <HeroSection categories={categories} cities={cities} />
      <CitiesSection cities={cities} />
      <CategoriesSection />
      <LatestBusinessesSection />
      <Footer />
    </>
  );
}
