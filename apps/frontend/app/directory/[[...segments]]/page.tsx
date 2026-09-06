import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { shouldShowBusinessRatings } from "@woyab/shared";
import { Link } from "@/i18n/navigation";
import Footer from "@/components/layout/Footer";
import { BusinessDirectory } from "@/features/businesses/BusinessDirectory";
import { JsonLd } from "@/components/seo/JsonLd";
import { appLocale, localizedUrl, publicMetadata } from "@/lib/seo";
import { directoryCopy, directoryPage, paginatedPath, topicDescription, topicName, topicTitle } from "@/lib/directory-seo";
import { DIRECTORY_PAGE_SIZE, getDirectoryListings, getDirectoryTopics } from "@/lib/directory-seo-data";
import { localizeBusinessContent } from "@/lib/business-localization";
import { fetchBusinessDirectory, type BusinessDirectoryData } from "@/lib/api";
import { fetchBusinessDirectoryOptions } from "@/lib/business-directory-options";
import { getBusinessDirectoryLabels } from "@/lib/business-directory-labels";
import { applyDirectoryDefaults, filtersFromSearchParams, matchesDirectoryScope } from "@/lib/directory-route-filters";

type Props = {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function context({ params, searchParams }: Props) {
  const [{ segments = [] }, query, language] = await Promise.all([params, searchParams, getLocale()]);
  const path = `/directory${segments.length ? `/${segments.map(encodeURIComponent).join("/")}` : ""}`;
  const page = directoryPage(query.page);
  if (page === null || (!segments.length && page !== 1)) notFound();
  const topics = await getDirectoryTopics();
  const topic = topics.find((item) => item.path === path);
  if (segments.length && !topic) notFound();
  const custom = Object.keys(query).some((key) => key !== "page");
  if (topic && !custom && page > Math.ceil(topic.count / DIRECTORY_PAGE_SIZE)) notFound();
  const defaults = { cityId: topic?.cityId, categoryId: topic?.categoryId, subCategoryId: topic?.subCategoryId };
  const paramsReader = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) paramsReader.append(key, item);
  }
  const filters = applyDirectoryDefaults(filtersFromSearchParams(paramsReader, DIRECTORY_PAGE_SIZE), paramsReader, defaults);
  return { path, page, topic, topics, locale: appLocale(language), custom, defaults, filters, queryKey: paramsReader.toString() };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { path, page, topic, locale, custom, filters, defaults } = await context(props);
  const copy = directoryCopy[locale];
  const scoped = topic && matchesDirectoryScope(filters, defaults);
  const title = scoped ? topicTitle(topic, locale) : copy.title;
  return {
    ...publicMetadata({ locale, pathname: paginatedPath(path, custom ? 1 : page),
      title: page > 1 ? `${title} – ${copy.page} ${page}` : title,
      description: scoped ? topicDescription(topic, locale) : copy.description }),
    ...(custom ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function DirectoryLandingPage(props: Props) {
  const { path, page, topic, topics, locale, custom, defaults, filters, queryKey } = await context(props);
  const copy = directoryCopy[locale];
  const title = topic ? topicTitle(topic, locale) : copy.title;
  const pageUrl = localizedUrl(locale, paginatedPath(path, page));
  const related = topic ? topics.filter((item) => item.path !== path && (
    topic.kind === "cities" ? item.cityId === topic.cityId
      : item.kind === "cities" ? item.cityId === topic.cityId
        : topic.subCategoryId ? item.subCategoryId === topic.subCategoryId
          : item.categoryId === topic.categoryId
  )) : topics.filter((item) => !item.city);
  const [labels, options, result, fallback] = topic ? await Promise.all([
    getBusinessDirectoryLabels(), fetchBusinessDirectoryOptions(locale, filters),
    fetchBusinessDirectory(locale, filters), custom ? null : getDirectoryListings(path, page),
  ]) : [null, null, null, null];
  // Use the same data and cards as /businesses. Keep a database-backed SSR
  // fallback for canonical pages if the separate search API is unavailable.
  const directory: BusinessDirectoryData | null = result && result.total > 0 ? result : fallback ? {
    page, limit: DIRECTORY_PAGE_SIZE, total: fallback.topic.count, totalPages: Math.ceil(fallback.topic.count / DIRECTORY_PAGE_SIZE),
    items: fallback.businesses.map((business) => ({
      id: business.id, businessId: business.id, slug: business.slug, href: `/businesses/${business.slug}`,
      title: localizeBusinessContent(business, locale).businessName,
      shortDescription: localizeBusinessContent(business, locale).shortDescription,
      imageUrl: business.coverImageUrl || (business.googlePlaceId ? `/api/businesses/${encodeURIComponent(business.id)}/google-photo-thumbnail?maxWidth=640` : null),
      categoryName: topicName(business.category, locale), categorySlug: business.category.slug, categoryIconKey: business.category.icon,
      location: topicName(business.city, locale), featured: business.featured, googlePlaceId: business.googlePlaceId,
      ratingsVisible: shouldShowBusinessRatings(business.category.slug, business.subCategory?.slug),
      rating: business.googleRating ?? business.averageRating, reviewCount: business.googleUserRatingCount ?? business.reviewCount,
      hours: business.businessHours,
    })),
  } : result;

  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: copy.home, item: localizedUrl(locale) },
      { "@type": "ListItem", position: 2, name: copy.title, item: localizedUrl(locale, "/directory") },
      ...(topic ? [{ "@type": "ListItem", position: 3, name: title, item: pageUrl }] : []),
    ] }} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", "@id": pageUrl, url: pageUrl, name: title, inLanguage: locale,
      ...(directory && !custom ? { mainEntity: { "@type": "ItemList", numberOfItems: directory.items.length, itemListElement: directory.items.map((business, index) => ({ "@type": "ListItem", position: (page - 1) * DIRECTORY_PAGE_SIZE + index + 1, name: business.title, url: localizedUrl(locale, business.href) })) } } : {}),
    }} />
    {topic && directory && options && labels ? <BusinessDirectory
      key={`${locale}:${path}?${queryKey}`}
      locale={locale} initialFilters={filters} initialDirectory={directory}
      categories={options.categories} subCategories={options.subCategories} tags={options.tags} cities={options.cities}
      labels={labels} route={{ pathname: path, defaults, title, description: topicDescription(topic, locale) }}
    /> : <header className="mx-auto max-w-7xl px-5 pb-4 pt-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black leading-snug text-slate-950 sm:text-4xl">{title}</h1>
      <p className="mt-5 max-w-4xl text-base leading-8 text-slate-600">{copy.description}</p>
      <Link href="/businesses" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-white">{copy.filter}</Link>
    </header>}
    <div className="mx-auto max-w-7xl px-5 pb-10 sm:px-6 lg:px-8">
      {(["cities", "categories", "specialties"] as const).map((kind) => {
        const items = related.filter((item) => item.kind === kind);
        return items.length > 0 && <section key={kind} className="mt-8">
          <h2 className="text-lg font-bold">{topic ? `${copy.related} · ` : ""}{copy[kind]}</h2>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">{items.map((item) => <li key={item.path}>
            <Link href={item.path} className="text-sm leading-7 text-slate-600 hover:text-primary hover:underline">{topicTitle(item, locale)} <span className="text-slate-500">({new Intl.NumberFormat(locale).format(item.count)})</span></Link>
          </li>)}</ul>
        </section>;
      })}
    </div>
    <Footer />
  </>;
}
