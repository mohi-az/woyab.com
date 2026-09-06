import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Footer from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { appLocale, localizedUrl, publicMetadata } from "@/lib/seo";
import { directoryCopy, directoryPage, paginatedPath, topicDescription, topicName, topicTitle } from "@/lib/directory-seo";
import { DIRECTORY_PAGE_SIZE, getDirectoryListings, getDirectoryTopics } from "@/lib/directory-seo-data";
import { localizeBusinessContent } from "@/lib/business-localization";

type Props = {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function context({ params, searchParams }: Props) {
  const [{ segments = [] }, query, language] = await Promise.all([params, searchParams, getLocale()]);
  const path = `/directory${segments.length ? `/${segments.map(encodeURIComponent).join("/")}` : ""}`;
  const page = directoryPage(query.page);
  if (page === null || (!segments.length && page !== 1)) notFound();
  const listing = segments.length ? await getDirectoryListings(path, page) : null;
  if (segments.length && !listing) notFound();
  return { path, page, listing, locale: appLocale(language), query };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { path, page, listing, locale, query } = await context(props);
  const copy = directoryCopy[locale];
  const title = listing ? topicTitle(listing.topic, locale) : copy.title;
  return {
    ...publicMetadata({ locale, pathname: paginatedPath(path, page),
      title: page > 1 ? `${title} – ${copy.page} ${page}` : title,
      description: listing ? topicDescription(listing.topic, locale) : copy.description }),
    ...(Object.keys(query).some((key) => key !== "page") ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function DirectoryLandingPage(props: Props) {
  const { path, page, listing, locale } = await context(props);
  const topics = await getDirectoryTopics();
  const copy = directoryCopy[locale];
  const title = listing ? topicTitle(listing.topic, locale) : copy.title;
  const pageUrl = localizedUrl(locale, paginatedPath(path, page));
  const breadcrumbs = [{ name: copy.home, item: localizedUrl(locale) }, { name: copy.title, item: localizedUrl(locale, "/directory") },
    ...(listing ? [{ name: title, item: pageUrl }] : [])];
  const related = listing ? topics.filter((item) => item.path !== path && (
    listing.topic.kind === "cities" ? item.cityId === listing.topic.cityId
      : item.kind === "cities" ? item.cityId === listing.topic.cityId
        : listing.topic.subCategoryId ? item.subCategoryId === listing.topic.subCategoryId
          : item.categoryId === listing.topic.categoryId
  )) : topics.filter((item) => !item.city);
  const filter = new URLSearchParams();
  if (listing?.topic.cityId) filter.set("cityId", String(listing.topic.cityId));
  if (listing?.topic.categoryId) filter.set("categoryId", String(listing.topic.categoryId));
  if (listing?.topic.subCategoryId) filter.set("subCategoryId", String(listing.topic.subCategoryId));
  const totalPages = listing ? Math.ceil(listing.topic.count / DIRECTORY_PAGE_SIZE) : 1;

  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: breadcrumbs.map((item, index) => ({ "@type": "ListItem", position: index + 1, ...item })) }} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", "@id": pageUrl, url: pageUrl, name: title, inLanguage: locale,
      ...(listing ? { mainEntity: { "@type": "ItemList", numberOfItems: listing.businesses.length, itemListElement: listing.businesses.map((business, index) => ({ "@type": "ListItem", position: (page - 1) * DIRECTORY_PAGE_SIZE + index + 1, name: localizeBusinessContent(business, locale).businessName, url: localizedUrl(locale, `/businesses/${business.slug}`) })) } } : {}),
    }} />
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
      <nav aria-label={copy.home} className="mb-6 flex flex-wrap gap-3 text-sm text-slate-600">
        <Link href="/">{copy.home}</Link><span aria-hidden="true">/</span><Link href="/directory">{copy.title}</Link>
      </nav>
      <header className="max-w-4xl">
        <h1 className="text-3xl font-black leading-snug text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-5 text-base leading-8 text-slate-600">{listing ? topicDescription(listing.topic, locale) : copy.description}</p>
        <Link href={`/businesses${filter.size ? `?${filter}` : ""}`} className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-white">{copy.filter}</Link>
      </header>
      {listing && <section className="mt-10" aria-labelledby="directory-results">
        <h2 id="directory-results" className="mb-5 text-2xl font-bold">{copy.results}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listing.businesses.map((business) => {
            const content = localizeBusinessContent(business, locale);
            return <article key={business.id} className="flex flex-col rounded-2xl border border-slate-200 p-6">
              <p className="text-sm text-slate-600">{topicName(business.subCategory || business.category, locale)} · {topicName(business.city, locale)}</p>
              <h3 className="mt-3 text-xl font-bold"><Link href={`/businesses/${business.slug}`}>{content.businessName}</Link></h3>
              {content.shortDescription && <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{content.shortDescription}</p>}
              {business.address && <p className="mt-4 text-sm leading-7">{business.address} {business.postalCode}</p>}
              {(business.phone || business.mobile) && <p className="mt-2 text-sm" dir="ltr">{business.phone || business.mobile}</p>}
              <Link href={`/businesses/${business.slug}`} className="mt-auto pt-5 text-sm font-bold text-primary">{copy.details}</Link>
            </article>;
          })}
        </div>
        {totalPages > 1 && <nav aria-label={copy.page} className="mt-8 flex items-center justify-center gap-6">
          {page > 1 && <Link href={paginatedPath(path, page - 1)} className="font-bold text-primary">{copy.previous}</Link>}
          <span>{copy.page} {new Intl.NumberFormat(locale).format(page)} / {new Intl.NumberFormat(locale).format(totalPages)}</span>
          {page < totalPages && <Link href={paginatedPath(path, page + 1)} className="font-bold text-primary">{copy.next}</Link>}
        </nav>}
      </section>}
      <section className="mt-12 rounded-2xl bg-slate-50 p-6 sm:p-8">
        <h2 className="text-xl font-bold">{copy.guideTitle}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-8 text-slate-600">{copy.guide}</p>
      </section>
      {(["cities", "categories", "specialties"] as const).map((kind) => {
        const items = related.filter((item) => item.kind === kind);
        return items.length > 0 && <section key={kind} className="mt-10">
          <h2 className="text-xl font-bold">{listing ? `${copy.related} · ` : ""}{copy[kind]}</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <li key={item.path}>
            <Link href={item.path} className="block rounded-xl border border-slate-200 px-4 py-3 text-sm leading-7 hover:border-primary">{topicTitle(item, locale)} <span className="text-slate-500">({new Intl.NumberFormat(locale).format(item.count)})</span></Link>
          </li>)}</ul>
        </section>;
      })}
    </div>
    <Footer />
  </>;
}
