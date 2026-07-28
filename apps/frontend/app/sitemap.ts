import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { appLocales } from "@/i18n/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fargo.de";

  // Static pages with alternates for each locale
  const staticPaths = ["/", "/businesses", "/legal/terms", "/privacy", "/privacy/business-claims"];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${baseUrl}${path === "/" ? "" : path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1.0 : 0.8,
    alternates: {
      languages: Object.fromEntries(
        appLocales.map((locale) => [
          locale,
          `${baseUrl}/${locale}${path === "/" ? "" : path}`,
        ]),
      ),
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
      url: `${baseUrl}/businesses/${business.slug}`,
      lastModified: business.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: {
        languages: Object.fromEntries(
          appLocales.map((locale) => [
            locale,
            `${baseUrl}/${locale}/businesses/${business.slug}`,
          ]),
        ),
      },
    }));
  } catch {
    // If database is unavailable during build, skip dynamic entries
  }

  return [...staticEntries, ...businessEntries];
}
