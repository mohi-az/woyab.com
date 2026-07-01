import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

// جلوگیری از هشدار مربوط به ریشه turbopack در monorepo
// تنظیمات مجاز برای بارگذاری تصاویر از منابع خارجی
const nextConfig: NextConfig = {
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
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
