import type { MetadataRoute } from "next";
import { appLocales } from "@/i18n/config";
import { appUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = [
    "/admin",
    "/dashboard",
    "/business-portal",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-2fa",
    "/offline",
  ];
  const localizedPrivatePaths = appLocales.flatMap((locale) =>
    privatePaths.map((path) => `/${locale}${path}`),
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/monitoring",
          ...privatePaths,
          ...localizedPrivatePaths,
        ],
      },
    ],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
