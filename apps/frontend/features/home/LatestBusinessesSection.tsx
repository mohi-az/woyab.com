import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import LatestBusinessesCarousel from "@/features/home/LatestBusinessesCarousel";
import { fetchLatestBusinesses } from "@/lib/api";

export default async function LatestBusinessesSection() {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("Home.latestBusinessesSection"),
  ]);
  const items = await fetchLatestBusinesses(locale);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="bg-[#fdf7f4] py-16 lg:py-20">
      <div className="mx-auto max-w-[1560px] px-5">
        <div className="mb-8">
          <div className="inline-block">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-[3.25rem]">
              {t("title")}
            </h2>
            <div className="mt-2 h-3 w-40 origin-left -rotate-2 rounded-full bg-primary/80 sm:w-52" />
          </div>
        </div>

        <LatestBusinessesCarousel
          items={items.map((item) => ({
            ...item,
            favoriteLabel: t("favoriteAction"),
            reviewsLabel: t("reviews", { count: item.reviewCount ?? 0 }),
            locationFallback: t("unknownLocation"),
          }))}
        />

        <div className="mt-10 flex justify-center">
          <Link
            href="/businesses"
            className="inline-flex min-w-52 items-center justify-center rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-[0_18px_35px_-18px_rgba(234,88,12,0.75)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
