// ثابت‌های اصلی اپلیکیشن

export const APP_CONFIG = {
  name: "Fargo",
  tagline: "Iranian Businesses in Germany",
  description: "دایرکتوری کسب‌وکارهای ایرانی در آلمان",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
} as const;

// آیتم‌های منوی ناوبری
export const NAV_LINKS: Array<{
  label: string;
  href: string;
  hasDropdown?: boolean;
  children?: Array<{ label: string; href: string }>;
}> = [
  { label: "Home", href: "/" },
  {
    label: "Businesses",
    href: "/businesses",
    hasDropdown: true,
    children: [
      { label: "All Businesses", href: "/businesses" },
      { label: "Featured", href: "/businesses/featured" },
      { label: "New Listings", href: "/businesses/new" },
    ],
  },
  { label: "Pricing", href: "/pricing" },
  { label: "Vendors", href: "/vendors" },
  {
    label: "Pages",
    href: "/pages",
    hasDropdown: true,
    children: [
      { label: "About Us", href: "/about" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  { label: "Contact", href: "/contact" },
];

// دسته‌بندی‌های کسب‌وکار
export const CATEGORIES: Array<{
  id: string;
  name: string;
  slug: string;
  icon: string;
}> = [
  { id: "restaurants", name: "Restaurants", slug: "restaurants", icon: "🍽️" },
  { id: "doctors", name: "Doctors", slug: "doctors", icon: "🩺" },
  { id: "pharmacies", name: "Pharmacies", slug: "pharmacies", icon: "💊" },
  { id: "cafes", name: "Cafes", slug: "cafes", icon: "☕" },
  { id: "supermarkets", name: "Supermarkets", slug: "supermarkets", icon: "🛒" },
  { id: "lawyers", name: "Lawyers", slug: "lawyers", icon: "⚖️" },
  { id: "beauty", name: "Beauty Salons", slug: "beauty", icon: "💇" },
  { id: "gyms", name: "Gyms & Sports", slug: "gyms", icon: "🏋️" },
  { id: "bookstores", name: "Bookstores", slug: "bookstores", icon: "📚" },
  { id: "repair", name: "Repair Shops", slug: "repair", icon: "🔧" },
];
