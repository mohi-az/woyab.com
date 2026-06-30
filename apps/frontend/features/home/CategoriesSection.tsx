import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { fetchCategoryCounts } from "@/lib/api";
import { FEATURED_CATEGORIES } from "@/lib/business-categories";

export default async function CategoriesSection() {
  const counts = await fetchCategoryCounts();
  const t = await getTranslations("Home.categoriesSection");

  return (
    <section className="relative overflow-hidden bg-gray-50 py-16 lg:py-24">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="float-y-slow absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-orange-100 opacity-45 blur-3xl" />
        <div className="float-x-slow absolute right-10 top-8 h-16 w-16 rotate-12 rounded-2xl bg-teal-100 opacity-60" />
        <div className="float-y-slower absolute left-[10%] top-1/2 h-12 w-12 -rotate-6 rounded-2xl bg-pink-100 opacity-55" />
        <div className="float-x-slower absolute -left-16 -top-4 h-60 w-60 rounded-full bg-blue-50 opacity-40 blur-2xl" />
        <div className="float-y-slow absolute left-[46%] top-5 h-9 w-9 rotate-6 rounded-xl bg-orange-100 opacity-50" />
        <div className="float-x-slower absolute -bottom-10 right-[12%] h-52 w-52 rounded-full bg-teal-50 opacity-35 blur-2xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="mb-10 text-center lg:mb-14">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-base text-gray-500">
            {t("description")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-5">
          {FEATURED_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = counts[cat.dbId] ?? 0;

            return (
              <Link
                key={cat.dbId}
                href={`/businesses?category=${cat.slug}`}
                className="cat-card group flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-300 hover:border-primary/20 hover:shadow-md sm:p-6"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 sm:h-20 sm:w-20">
                  <Icon className="cat-icon text-3xl text-primary sm:text-4xl" />
                </div>

                <span className="text-center text-sm font-bold leading-snug text-gray-900 sm:text-base">
                  {t(`items.${cat.labelKey}`)}
                </span>

                <span className="count-badge rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
