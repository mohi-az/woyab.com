import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WoYab - Iranian Businesses in Germany",
    short_name: "WoYab",
    description:
      "Verzeichnis iranischer Unternehmen in Deutschland - Restaurants, Apotheken, Anwalte und mehr",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f5735c",
    orientation: "any",
    lang: "de",
    categories: ["business", "directory"],
    icons: [
      { src: "/pwa-icons/72", sizes: "72x72", type: "image/png" },
      { src: "/pwa-icons/96", sizes: "96x96", type: "image/png" },
      { src: "/pwa-icons/128", sizes: "128x128", type: "image/png" },
      { src: "/pwa-icons/144", sizes: "144x144", type: "image/png" },
      { src: "/pwa-icons/152", sizes: "152x152", type: "image/png" },
      { src: "/pwa-icons/192", sizes: "192x192", type: "image/png" },
      {
        src: "/pwa-icons/192?purpose=maskable",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/pwa-icons/384", sizes: "384x384", type: "image/png" },
      { src: "/pwa-icons/512", sizes: "512x512", type: "image/png" },
      {
        src: "/pwa-icons/512?purpose=maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Unternehmen suchen",
        short_name: "Suche",
        description: "Suche nach iranischen Unternehmen in Deutschland",
        url: "/businesses?ref=pwa-shortcut",
        icons: [{ src: "/pwa-icons/96", sizes: "96x96", type: "image/png" }],
      },
    ],
  };
}
