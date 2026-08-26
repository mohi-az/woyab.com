import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import BusinessDetailClient from "@/features/businesses/BusinessDetailClient";
import {
  fetchBusinessDetailFromDatabase,
  fetchBusinessReviewsFromDatabase,
} from "@/lib/business-detail-data";
import { JsonLd } from "@/components/seo/JsonLd";

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

  const title = `${business.title} | WoYab`;
  const description = business.shortDescription ?? business.description ?? business.title;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: business.coverImageUrl ? [{ url: business.coverImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: business.coverImageUrl ? [business.coverImageUrl] : undefined,
    },
  };
}

export default async function BusinessDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("BusinessDetail");
  const business = await fetchBusinessDetailFromDatabase(locale, slug);

  if (!business) {
    notFound();
  }

  const reviews = await fetchBusinessReviewsFromDatabase(business.id);

  return (
    <>
      <div className="sr-only">{t("pageLabel")}</div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: business.title,
          description: business.shortDescription ?? business.description ?? undefined,
          image: business.coverImageUrl ? [business.coverImageUrl] : undefined,
        }}
      />
      <BusinessDetailClient business={business} initialReviews={reviews} />
    </>
  );
}
