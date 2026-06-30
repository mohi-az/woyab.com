import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// تنظیمات viewport باید جدا از metadata export شود (Next.js 13+)
export const viewport: Viewport = {
  themeColor: "#f5735c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Fargo — Iranian Businesses in Germany",
  description:
    "دایرکتوری کسب‌وکارهای ایرانی در آلمان — پزشک، رستوران، داروخانه، وکیل و بیشتر",
  keywords: ["Iranian businesses", "Germany", "فارسی", "کسب‌وکار ایرانی", "آلمان"],
  // تنظیمات PWA برای iOS Safari
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fargo",
  },
  // غیرفعال کردن تشخیص خودکار شماره تلفن در iOS
  formatDetection: { telephone: false },
  // آیکون‌های مختلف برای مرورگرها و دستگاه‌ها
  icons: {
    icon: [
      { url: "/pwa-icons/32",  sizes: "32x32",   type: "image/png" },
      { url: "/pwa-icons/192", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/pwa-icons/152", sizes: "152x152", type: "image/png" },
      { url: "/pwa-icons/180", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-gray-900">
        {/* ثبت Service Worker — فقط در production اجرا می‌شود */}
        <ServiceWorkerRegistration />
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
