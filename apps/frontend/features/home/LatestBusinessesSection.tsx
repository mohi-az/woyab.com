import { getLocale, getTranslations } from "next-intl/server";
import LatestBusinessesCarousel from "@/features/home/LatestBusinessesCarousel";
import { Link } from "@/i18n/navigation";
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
    <section className="relative isolate overflow-hidden bg-white py-18 lg:py-26">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-40 top-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="latest-shape-orbit absolute -start-14 top-20 hidden h-36 w-36 sm:block">
          <div className="h-full w-full rounded-full border-[18px] border-primary/10 shadow-[inset_0_0_0_8px_rgba(241,91,63,.035)]" />
        </div>
        <div className="latest-shape-float absolute end-[7%] top-14 h-20 w-20">
          <div className="h-full w-full rotate-[28deg] rounded-[22px] border-[7px] border-amber-200/55 bg-amber-50/45" />
        </div>
        <div className="latest-shape-dots latest-shape-float-reverse absolute bottom-20 start-[4%] h-24 w-24 opacity-50 sm:h-28 sm:w-28" />
        <div className="latest-shape-orbit absolute -end-12 bottom-12 h-36 w-36">
          <div className="h-full w-full rotate-12 bg-primary/7 [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />
        </div>
        <div className="latest-shape-pulse absolute end-[24%] bottom-10 h-5 w-5 rounded-full bg-sky-300/45 ring-8 ring-sky-100/60" />
        <div className="latest-shape-float-reverse absolute start-[23%] top-12 h-8 w-8 rounded-lg border-4 border-teal-300/35" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">{t("eyebrow")}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              {t("title")}
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-7 text-slate-500 sm:text-base">{t("description")}</p>
        </div>

        <LatestBusinessesCarousel
          items={items.map((item) => ({
            ...item,
            favoriteLabel: t("favoriteAction"),
            reviewsLabel: t("reviews", { count: item.reviewCount ?? 0 }),
            locationFallback: t("unknownLocation"),
            featuredLabel: t("featured"),
          }))}
        />

        <div className="mt-11 flex justify-center">
          <Link
            href="/businesses"
            className="inline-flex min-w-52 items-center justify-center rounded-xl bg-slate-950 px-8 py-4 text-base font-extrabold text-white shadow-[0_18px_35px_-18px_rgba(15,23,42,.7)] transition hover:-translate-y-0.5 hover:bg-primary"
          >
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
