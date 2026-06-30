import type { MetadataRoute } from "next";

// Web App Manifest برای PWA
// آدرس سرو: /manifest.webmanifest
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fargo — Iranian Businesses in Germany",
    short_name: "Fargo",
    description:
      "دایرکتوری کسب‌وکارهای ایرانی در آلمان — پزشک، رستوران، داروخانه، وکیل و بیشتر",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f5735c",
    orientation: "any",
    lang: "en",
    categories: ["business", "directory"],
    // آیکون‌ها از route داینامیک /pwa-icons/[size] سرو می‌شوند
    icons: [
      { src: "/pwa-icons/72",  sizes: "72x72",   type: "image/png" },
      { src: "/pwa-icons/96",  sizes: "96x96",   type: "image/png" },
      { src: "/pwa-icons/128", sizes: "128x128", type: "image/png" },
      { src: "/pwa-icons/144", sizes: "144x144", type: "image/png" },
      { src: "/pwa-icons/152", sizes: "152x152", type: "image/png" },
      { src: "/pwa-icons/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa-icons/384", sizes: "384x384", type: "image/png" },
      { src: "/pwa-icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Search Businesses",
        short_name: "Search",
        description: "Search for Iranian businesses in Germany",
        url: "/businesses?ref=pwa-shortcut",
        icons: [{ src: "/pwa-icons/96", sizes: "96x96", type: "image/png" }],
      },
    ],
  };
}
