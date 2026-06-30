export const APP_CONFIG = {
  name: "Fargo",
  tagline: "Iranian Businesses in Germany",
  description: "Directory for Iranian businesses in Germany",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
} as const;

export const NAV_LINKS: Array<{
  labelKey: string;
  href: string;
  hasDropdown?: boolean;
  children?: Array<{ labelKey: string; href: string }>;
}> = [
  { labelKey: "home", href: "/" },
  {
    labelKey: "businesses",
    href: "/businesses",
    hasDropdown: true,
    children: [
      { labelKey: "allBusinesses", href: "/businesses" },
      { labelKey: "featured", href: "/businesses/featured" },
      { labelKey: "newListings", href: "/businesses/new" },
    ],
  },
  { labelKey: "pricing", href: "/pricing" },
  { labelKey: "vendors", href: "/vendors" },
  {
    labelKey: "pages",
    href: "/pages",
    hasDropdown: true,
    children: [
      { labelKey: "aboutUs", href: "/about" },
      { labelKey: "howItWorks", href: "/how-it-works" },
      { labelKey: "faq", href: "/faq" },
    ],
  },
  { labelKey: "contact", href: "/contact" },
];

export const CATEGORIES: Array<{
  id: string;
  slug: string;
  icon: string;
}> = [
  { id: "restaurants", slug: "restaurants", icon: "🍽️" },
  { id: "doctors", slug: "doctors", icon: "🩺" },
  { id: "pharmacies", slug: "pharmacies", icon: "💊" },
  { id: "cafes", slug: "cafes", icon: "☕" },
  { id: "supermarkets", slug: "supermarkets", icon: "🛒" },
  { id: "lawyers", slug: "lawyers", icon: "⚖️" },
  { id: "beauty", slug: "beauty", icon: "💇" },
  { id: "gyms", slug: "gyms", icon: "🏋️" },
  { id: "bookstores", slug: "bookstores", icon: "📚" },
  { id: "repair", slug: "repair", icon: "🔧" },
];
