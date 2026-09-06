import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { appLocales } from "@/i18n/config";
import { localizedAlternates, localizedUrl } from "@/lib/seo";
import { getDirectoryTopics } from "@/lib/directory-seo-data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [businesses, topics] = await Promise.all([
    prisma.business.findMany({
      where: { removedAt: null, status: "ACTIVE", verified: true },
      select: { slug: true, updatedAt: true },
      orderBy: { id: "asc" },
    }),
    getDirectoryTopics(),
  ]);
  const pages: Array<{ path: string; lastModified?: Date }> = [
    ...["/", "/businesses", "/directory", "/for-businesses", "/contact", "/legal/terms", "/privacy", "/privacy/business-claims"].map((path) => ({ path })),
    ...topics.map((topic) => ({ path: topic.path })),
    ...businesses.map((business) => ({ path: `/businesses/${business.slug}`, lastModified: business.updatedAt })),
  ];
  // Each language has its own URL and reciprocal alternates.
  // Do not silently publish a truncated sitemap when the database is down.
  return pages.flatMap(({ path, lastModified }) => appLocales.map((locale) => ({
    url: localizedUrl(locale, path),
    ...(lastModified ? { lastModified } : {}),
    alternates: { languages: localizedAlternates(locale, path).languages },
  })));
}
