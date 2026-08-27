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
import "antd/dist/reset.css";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#f15b3f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://woyab.de";


export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "WoYab — Alles in deiner Nähe. Für deine Community",
    template: "%s | WoYab",
  },
  description:
    "WoYab: Alles in deiner Nähe. Für deine Community. Das umfassende Verzeichnis persischsprachiger (iranischer & afghanischer) Unternehmen, Ärzte, Restaurants und Dienstleistungen in Deutschland.",
  keywords: [
    "WoYab",
    "WoYab App",
    "persischsprachige Unternehmen Deutschland",
    "iranische Unternehmen Deutschland",
    "afghanische Unternehmen Deutschland",
    "persische Ärzte Deutschland",
    "کسب‌وکار فارسی‌زبان آلمان",
    "کسب و کار افغانستانی در آلمان",
    "کسب و کار ایرانی در آلمان",
    "نیازمندی های آلمان",
    "Persian-speaking businesses Germany",
    "Afghan directory Germany",
    "Iranian directory Germany",
  ],
  authors: [{ name: "WoYab" }],
  creator: "WoYab",
  publisher: "WoYab",
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
    siteName: "WoYab",
    title: "WoYab — Persischsprachige Unternehmen in Deutschland",
    description:
      "Das umfassende Verzeichnis persischsprachiger (iranischer & afghanischer) Unternehmen in Deutschland. Restaurants, Ärzte, Anwälte und mehr.",
    locale: "de_DE",
    alternateLocale: ["en_US", "fa_IR"],
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "WoYab — Persischsprachige Unternehmen in Deutschland",
    description:
      "Das umfassende Verzeichnis persischsprachiger (iranischer & afghanischer) Unternehmen in Deutschland.",
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
    title: "WoYab",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/pwa-icons/32.png", sizes: "32x32", type: "image/png" },
      { url: "/pwa-icons/192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/pwa-icons/152.png", sizes: "152x152", type: "image/png" },
      { url: "/pwa-icons/180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
