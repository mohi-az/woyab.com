import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import BusinessDetailClient from "@/features/businesses/BusinessDetailClient";
import { fetchBusinessBySlug, fetchBusinessReviews } from "@/lib/api";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const business = await fetchBusinessBySlug(locale, slug);

  if (!business) {
    return {};
  }

  return {
    title: `${business.title} | Fargo`,
    description: business.shortDescription ?? business.description ?? business.title,
  };
}

export default async function BusinessDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("BusinessDetail");
  const business = await fetchBusinessBySlug(locale, slug);

  if (!business) {
    notFound();
  }

  const reviews = await fetchBusinessReviews(business.id);

  return (
    <>
      <div className="sr-only">{t("pageLabel")}</div>
      <BusinessDetailClient business={business} initialReviews={reviews} />
    </>
  );
}
