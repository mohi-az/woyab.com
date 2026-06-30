"use client";

// کامپوننت ثبت Service Worker — فقط در production اجرا می‌شود
// next-pwa فایل /public/sw.js را در build تولید می‌کند
// ثبت دستی به دلیل عدم پشتیبانی next-pwa از App Router
import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((reg) => {
            // بررسی بروزرسانی هر ۶۰ ثانیه یک‌بار
            setInterval(() => reg.update(), 60 * 60 * 1000);
          })
          .catch(() => {
            // SW اختیاری است — در صورت خطا برنامه ادامه می‌یابد
          });
      });
    }
  }, []);

  return null;
}
