import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { fetchCategoryCounts } from "@/lib/api";
import { FEATURED_CATEGORIES } from "@/lib/business-categories";

export default async function CategoriesSection() {
  const counts = await fetchCategoryCounts();
  const t = await getTranslations("Home.categoriesSection");

  return (
    <section className="relative overflow-hidden bg-[#f8f5f1] py-18 lg:py-26">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -bottom-36 -left-28 h-96 w-96 rounded-full border-[62px] border-primary/5" />
        <div className="absolute -right-20 top-14 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="mb-10 text-center lg:mb-14">
          <span className="inline-block h-1 w-12 rounded-full bg-primary" />
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500">
            {t("description")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
          {FEATURED_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = counts[cat.dbId] ?? 0;

            return (
              <Link
                key={cat.dbId}
                href={`/businesses?categoryId=${cat.dbId}`}
                className="cat-card group flex flex-col items-center gap-3 rounded-2xl border border-white bg-white p-5 text-center shadow-[0_12px_35px_rgba(15,23,42,.06)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_20px_45px_rgba(15,23,42,.1)] sm:p-7"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1ed] ring-8 ring-[#fff8f5] sm:h-20 sm:w-20">
                  <Icon className="cat-icon text-3xl text-primary sm:text-[2.35rem]" />
                </div>

                <span className="text-sm font-extrabold leading-snug text-slate-900 sm:text-base">
                  {t(`items.${cat.labelKey}`)}
                </span>

                <span className="count-badge rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
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
