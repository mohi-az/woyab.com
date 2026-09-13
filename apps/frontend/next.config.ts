import createNextIntlPlugin from "next-intl/plugin";
import { resolve } from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: resolve(process.cwd(), "../.."),
  outputFileTracingIncludes: {
    "/*": ["../../packages/database/generated/prisma/**/*"],
  },
  // Railway exposes the commit SHA at build and runtime. Including it in client
  // requests lets Next detect an old browser tab after a rolling deployment.
  deploymentId: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.NEXT_DEPLOYMENT_ID || undefined,
  transpilePackages: ["@woyab/database", "@woyab/shared"],
  turbopack: {
    root: resolve(process.cwd(), "../.."),
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

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: "/monitoring",
  widenClientFileUpload: true,
  silent: !process.env.CI,
});
