import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { appLocales } from "@/i18n/config";
import { localizedUrl } from "@/lib/seo";

// Keep business URLs current instead of freezing the sitemap at build time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages with alternates for each locale
  const staticPaths = [
    "/",
    "/businesses",
    "/for-businesses",
    "/contact",
    "/legal/terms",
    "/privacy",
    "/privacy/business-claims",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: localizedUrl("de", path),
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1.0 : 0.8,
    alternates: {
      languages: {
        ...Object.fromEntries(
          appLocales.map((locale) => [
            locale,
            localizedUrl(locale, path),
          ]),
        ),
        "x-default": localizedUrl("de", path),
      },
    },
  }));

  // Dynamic business pages
  let businessEntries: MetadataRoute.Sitemap = [];
  try {
    const businesses = await prisma.business.findMany({
      where: { removedAt: null, status: "ACTIVE", verified: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    businessEntries = businesses.map((business) => ({
      url: localizedUrl("de", `/businesses/${business.slug}`),
      lastModified: business.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          ...Object.fromEntries(
            appLocales.map((locale) => [
              locale,
              localizedUrl(locale, `/businesses/${business.slug}`),
            ]),
          ),
          "x-default": localizedUrl("de", `/businesses/${business.slug}`),
        },
      },
    }));
  } catch {
    // If database is unavailable during build, skip dynamic entries
  }

  return [...staticEntries, ...businessEntries];
}
