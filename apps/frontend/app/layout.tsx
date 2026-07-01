import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { LocaleObserver } from "@/components/i18n/LocaleObserver";
import { getDirection, isAppLocale } from "@/i18n/config";
import { dirooz, geistMono, geistSans } from "@/styles/fonts";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#f15b3f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Fargo - Iranian Businesses in Germany",
  description: "Directory for Iranian businesses in Germany",
  keywords: ["Iranian businesses", "Germany", "Fargo", "Persian", "Deutsch"],
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
  const locale = await getLocale();
  const messages = await getMessages();
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
          <LocaleObserver />
          <ServiceWorkerRegistration />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
