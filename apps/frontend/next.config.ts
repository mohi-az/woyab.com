import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fargo/database", "@fargo/shared"],
  turbopack: {
    root: "../../",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.stuttgart-tourist.de",
      },
      {
        protocol: "https",
        hostname: "www.klassenfahrten-kluehspies.de",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
