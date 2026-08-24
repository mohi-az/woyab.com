export const APP_CONFIG = {
  name: "woYab",
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
  { labelKey: "businesses", href: "/businesses" },
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
