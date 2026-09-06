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
import { appUrl } from "@/lib/seo";

export const viewport: Viewport = {
  themeColor: "#f15b3f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

const appleStartupScreens = [
  { width: 440, height: 956, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 420, height: 912, ratio: 3 },
  { width: 414, height: 896, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 402, height: 874, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 375, height: 812, ratio: 3 },
  { width: 375, height: 667, ratio: 2 },
  { width: 360, height: 780, ratio: 3 },
  { width: 320, height: 568, ratio: 2 },
  { width: 1024, height: 1366, ratio: 2 },
  { width: 834, height: 1194, ratio: 2 },
  { width: 834, height: 1112, ratio: 2 },
  { width: 820, height: 1180, ratio: 2 },
  { width: 810, height: 1080, ratio: 2 },
  { width: 768, height: 1024, ratio: 2 },
] as const;

function appleStartupMedia(
  width: number,
  height: number,
  ratio: number,
  orientation: "portrait" | "landscape",
) {
  return `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: ${orientation})`;
}


export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
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
      { url: "/pwa-icons/152.png?purpose=maskable", sizes: "152x152", type: "image/png" },
      { url: "/pwa-icons/180.png?purpose=maskable", sizes: "180x180", type: "image/png" },
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
      <head>
        {appleStartupScreens.flatMap(({ width, height, ratio }) => {
          const portraitWidth = width * ratio;
          const portraitHeight = height * ratio;

          return [
            <link
              key={`${width}x${height}@${ratio}-portrait`}
              rel="apple-touch-startup-image"
              href={`/apple-splash/${portraitWidth}x${portraitHeight}`}
              media={appleStartupMedia(width, height, ratio, "portrait")}
            />,
            <link
              key={`${width}x${height}@${ratio}-landscape`}
              rel="apple-touch-startup-image"
              href={`/apple-splash/${portraitHeight}x${portraitWidth}`}
              media={appleStartupMedia(width, height, ratio, "landscape")}
            />,
          ];
        })}
      </head>
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
