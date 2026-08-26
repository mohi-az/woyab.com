import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FEATURED_CATEGORIES } from "@/lib/business-categories";

type Props = { counts: Record<number, number> };

export default async function CategoriesSection({ counts }: Props) {
  const t = await getTranslations("Home.categoriesSection");

  return (
    <section className="relative overflow-hidden bg-[#f8f5f1] pb-18 pt-10 lg:pb-24 lg:pt-14">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -bottom-36 -left-28 h-96 w-96 rounded-full border-[62px] border-primary/5" />
        <div className="absolute -right-20 top-14 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 xl:w-[80%] xl:max-w-none">
        <div className="mb-10 text-center lg:mb-14">
          <span className="inline-block h-1 w-12 rounded-full bg-primary" />
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500">
            {t("description")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-16 md:grid-cols-4 lg:gap-x-6 lg:gap-y-20">
          {FEATURED_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = counts[cat.dbId] ?? 0;

            return (
              <Link
                key={cat.dbId}
                href={`/businesses?categoryId=${cat.dbId}`}
                className="cat-card group relative isolate flex min-h-[9.1rem] items-center justify-center overflow-visible rounded-[1.35rem] border border-slate-200 bg-white px-3 pb-7 pt-7 text-center transition-[border-color,box-shadow] duration-300 hover:border-primary/60 hover:shadow-[0_20px_38px_rgba(241,91,63,.12)] focus-visible:border-primary/60 focus-visible:shadow-[0_20px_38px_rgba(241,91,63,.12)] sm:min-h-[10.1rem] sm:px-5 sm:pb-8 sm:pt-9"
              >
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent transition duration-300 group-hover:via-primary/35 group-focus-visible:via-primary/35" />

                <div className="cat-icon-shell pointer-events-none absolute left-1/2 top-0 flex h-[3.7rem] w-[3.7rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_12px_24px_rgba(15,23,42,.08)] ring-6 ring-[#f8f5f1] transition-[box-shadow] duration-300 sm:h-[4.2rem] sm:w-[4.2rem]">
                  <Icon className="cat-icon text-[1.55rem] text-primary sm:text-[1.8rem]" />
                </div>

                <span className="max-w-[8.2rem] text-base font-black leading-tight tracking-[-0.02em] text-slate-950 sm:max-w-[9.4rem] sm:text-[1.15rem]">
                  {t(`items.${cat.labelKey}`)}
                </span>

                <span className="cat-badge pointer-events-none absolute bottom-0 left-1/2 inline-flex h-[2.3rem] w-[4.35rem] -translate-x-1/2 items-center justify-center rounded-t-full border-x border-t border-b-0 border-transparent bg-[#f8f5f1] pt-1 text-sm font-black text-slate-500 transition-[background-color,border-color,color,box-shadow] duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-white group-focus-visible:border-primary group-focus-visible:bg-primary group-focus-visible:text-white sm:h-[2.55rem] sm:w-[4.8rem] sm:text-base">
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
