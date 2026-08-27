import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import BusinessDetailClient from "@/features/businesses/BusinessDetailClient";
import {
  fetchBusinessDetailFromDatabase,
  fetchBusinessReviewsFromDatabase,
} from "@/lib/business-detail-data";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  absoluteUrl,
  appLocale as toAppLocale,
  localizedUrl,
  publicMetadata,
} from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const business = await fetchBusinessDetailFromDatabase(locale, slug);

  if (!business) {
    return {};
  }

  const title = business.title;
  const description = business.shortDescription ?? business.description ?? business.title;

  return publicMetadata({
    locale: toAppLocale(locale),
    pathname: `/businesses/${slug}`,
    title,
    description,
    image: business.coverImageUrl,
  });
}

export default async function BusinessDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("BusinessDetail");
  const business = await fetchBusinessDetailFromDatabase(locale, slug);

  if (!business) {
    notFound();
  }

  const reviews = await fetchBusinessReviewsFromDatabase(business.id, locale);
  const currentLocale = toAppLocale(locale);
  const pageUrl = localizedUrl(currentLocale, `/businesses/${slug}`);
  const openingHoursSpecification = business.hours
    .filter((hour) => !hour.isClosed && Boolean(hour.openTime) && Boolean(hour.closeTime))
    .map((hour) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${hour.dayOfWeek[0]}${hour.dayOfWeek.slice(1).toLowerCase()}`,
      opens: hour.openTime,
      closes: hour.closeTime,
    }));
  const sameAs = [business.website, ...business.socialLinks.map((link) => link.url)].filter(
    (url): url is string => Boolean(url),
  );
  const hasAggregateRating = business.rating > 0 && business.reviewCount > 0;

  return (
    <>
      <div className="sr-only">{t("pageLabel")}</div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": pageUrl,
          name: business.title,
          description: business.shortDescription ?? business.description ?? undefined,
          url: pageUrl,
          image: business.coverImageUrl ? [absoluteUrl(business.coverImageUrl)] : undefined,
          telephone: business.phone ?? business.mobile ?? undefined,
          email: business.email ?? undefined,
          priceRange: business.priceRange ?? undefined,
          address: business.address
            ? {
                "@type": "PostalAddress",
                streetAddress: business.address,
                postalCode: business.postalCode ?? undefined,
                addressLocality: business.location ?? undefined,
                addressCountry: "DE",
              }
            : undefined,
          geo: typeof business.latitude === "number" && typeof business.longitude === "number"
            ? {
                "@type": "GeoCoordinates",
                latitude: business.latitude,
                longitude: business.longitude,
              }
            : undefined,
          openingHoursSpecification: openingHoursSpecification.length ? openingHoursSpecification : undefined,
          sameAs: sameAs.length ? sameAs : undefined,
          aggregateRating: hasAggregateRating
            ? {
                "@type": "AggregateRating",
                ratingValue: business.rating,
                reviewCount: business.reviewCount,
              }
            : undefined,
        }}
      />
      <BusinessDetailClient business={business} initialReviews={reviews} />
    </>
  );
}
