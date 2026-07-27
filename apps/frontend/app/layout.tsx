import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { auth } from "@/auth";
import Navbar from "@/components/layout/Navbar";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { LocaleObserver } from "@/components/i18n/LocaleObserver";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { CookieConsent } from "@/components/privacy/CookieConsent";
import { getDirection, isAppLocale } from "@/i18n/config";
import { dirooz, geistMono, geistSans } from "@/styles/fonts";
import { assertProductionConfiguration } from "@/lib/privacy-config";
import "antd/dist/reset.css";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#f15b3f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fargo.de";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Fargo — Persischsprachige Unternehmen in Deutschland",
    template: "%s | Fargo",
  },
  description:
    "Fargo ist das umfassende Verzeichnis persischsprachiger Unternehmen in Deutschland. Finden Sie Restaurants, Ärzte, Anwälte, Supermärkte und viele weitere persische Dienstleistungen in Ihrer Nähe.",
  keywords: [
    "Persian-speaking businesses Germany",
    "persischsprachige Unternehmen Deutschland",
    "کسب‌وکار فارسی‌زبان آلمان",
    "Persian directory",
    "Fargo",
    "persischsprachige Restaurants",
    "persischsprachige Ärzte",
    "persische Dienstleistungen",
  ],
  authors: [{ name: "Fargo" }],
  creator: "Fargo",
  publisher: "Fargo",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "Fargo",
    title: "Fargo — Iranische Unternehmen in Deutschland",
    description:
      "Das umfassende Verzeichnis iranischer Unternehmen in Deutschland. Restaurants, Ärzte, Anwälte und mehr.",
    locale: "de_DE",
    alternateLocale: ["en_US", "fa_IR"],
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fargo — Iranische Unternehmen in Deutschland",
    description:
      "Das umfassende Verzeichnis iranischer Unternehmen in Deutschland.",
  },
  alternates: {
    canonical: "/",
    languages: {
      de: "/de",
      en: "/en",
      fa: "/fa",
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fargo",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/pwa-icons/32", sizes: "32x32", type: "image/png" },
      { url: "/pwa-icons/192", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/pwa-icons/152", sizes: "152x152", type: "image/png" },
      { url: "/pwa-icons/180", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  assertProductionConfiguration();
  const locale = await getLocale();
  const messages = await getMessages();
  const session = await auth();
  const appLocale = isAppLocale(locale) ? locale : "de";

  return (
    <html
      lang={appLocale}
      dir={getDirection(appLocale)}
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} ${dirooz.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-gray-900">
        <NextIntlClientProvider locale={appLocale} messages={messages}>
          <AuthProvider session={session}>
            <LocaleObserver />
            <ServiceWorkerRegistration />
            <Navbar />
            <main className="flex-1 pt-16 lg:pt-[4.75rem]">{children}</main>
            <CookieConsent />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
