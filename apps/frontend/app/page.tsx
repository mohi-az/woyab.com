import type { Metadata } from "next";
import HeroSection from "@/features/home/HeroSection";
import CategoriesSection from "@/features/home/CategoriesSection";
import LatestBusinessesSection from "@/features/home/LatestBusinessesSection";
import CitiesSection from "@/features/home/CitiesSection";
import Footer from "@/components/layout/Footer";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { directoryCopy } from "@/lib/directory-seo";
import { isAppLocale } from "@/i18n/config";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchHomeData } from "@/lib/home-data";
import { appLocale as toAppLocale, localizedUrl, publicMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = toAppLocale(await getLocale());
  const copy = directoryCopy[locale];
  return publicMetadata({
    locale: toAppLocale(locale),
    title: copy.title,
    description: copy.description,
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
          alternateName: "وویاب",
          inLanguage: locale,
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
      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold">{directoryCopy[locale].title}</h2>
        <p className="mt-4 max-w-3xl leading-8 text-slate-600">{directoryCopy[locale].description}</p>
        <Link href="/directory" className="mt-5 inline-flex font-bold text-primary">{directoryCopy[locale].cities} · {directoryCopy[locale].categories} · {directoryCopy[locale].specialties}</Link>
      </section>
      <Footer />
    </>
  );
}
