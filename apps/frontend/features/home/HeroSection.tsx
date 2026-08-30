"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FiChevronDown, FiMapPin, FiSearch } from "react-icons/fi";
import { HiOutlineBuildingStorefront } from "react-icons/hi2";
import { isAppLocale, localizePathname } from "@/i18n/config";
import type { DirectoryFilterOption } from "@/lib/api";

type Props = {
  categories: DirectoryFilterOption[];
  cities: DirectoryFilterOption[];
};

export default function HeroSection({ categories, cities }: Props) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cityId, setCityId] = useState("");
  const t = useTranslations("Home.hero");
  const locale = useLocale();
  const activeLocale = isAppLocale(locale) ? locale : "de";
  const collator = new Intl.Collator(locale);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (categoryId) params.set("categoryId", categoryId);
    if (cityId) params.set("cityId", cityId);
    const search = params.toString();
    window.location.assign(localizePathname(search ? `/businesses?${search}` : "/businesses", activeLocale));
  }

  return (
    <section className="hero-theme relative isolate -mt-16 min-h-[650px] overflow-hidden bg-slate-950 text-white lg:-mt-[4.75rem] lg:min-h-[720px]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,18,31,.94)_0%,rgba(10,18,31,.82)_48%,rgba(10,18,31,.4)_100%)] rtl:bg-[linear-gradient(270deg,rgba(10,18,31,.94)_0%,rgba(10,18,31,.82)_48%,rgba(10,18,31,.4)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(241,91,63,.22),transparent_30%)]" />
      <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full border-[46px] border-white/5" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[650px] max-w-7xl items-center px-5 pb-32 pt-28 sm:px-6 lg:min-h-[720px] lg:pb-40 lg:pt-32">
        <div className="max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/85 backdrop-blur">
            <HiOutlineBuildingStorefront className="text-lg text-primary" /> {t("eyebrow")}
          </span>
          <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl lg:text-7xl">
            {t.rich("title", { br: () => <br /> })}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">{t("description")}</p>

          <form onSubmit={handleSearch} className="mt-9 rounded-2xl bg-white p-2.5 shadow-[0_25px_70px_rgba(0,0,0,.28)] sm:p-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1.45fr)_minmax(180px,.8fr)_minmax(170px,.75fr)_56px]">
              <label className="flex min-h-14 items-center gap-3 rounded-xl bg-slate-50 px-4 text-slate-700 focus-within:ring-2 focus-within:ring-primary/25">
                <FiSearch className="shrink-0 text-xl text-primary" />
                <span className="sr-only">{t("queryPlaceholder")}</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("queryPlaceholder")} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
              </label>

              <label className="relative flex min-h-14 items-center gap-3 rounded-xl bg-slate-50 px-4 text-slate-700 focus-within:ring-2 focus-within:ring-primary/25">
                <HiOutlineBuildingStorefront className="shrink-0 text-xl text-primary" />
                <span className="sr-only">{t("categoriesLabel")}</span>
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent pe-5 text-sm outline-none">
                  <option value="">{t("allCategories")}</option>
                  {[...categories].sort((a, b) => collator.compare(a.name, b.name)).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <FiChevronDown className="pointer-events-none absolute end-3 text-slate-400" />
              </label>

              <label className="relative flex min-h-14 items-center gap-3 rounded-xl bg-slate-50 px-4 text-slate-700 focus-within:ring-2 focus-within:ring-primary/25">
                <FiMapPin className="shrink-0 text-xl text-primary" />
                <span className="sr-only">{t("locationPlaceholder")}</span>
                <select value={cityId} onChange={(event) => setCityId(event.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent pe-5 text-sm outline-none">
                  <option value="">{t("allCities")}</option>
                  {[...cities].sort((a, b) => collator.compare(a.name, b.name)).map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                </select>
                <FiChevronDown className="pointer-events-none absolute end-3 text-slate-400" />
              </label>

              <button type="submit" aria-label={t("search")} className="inline-flex min-h-14 cursor-pointer items-center justify-center rounded-xl bg-primary text-xl text-white shadow-[0_10px_25px_rgba(241,91,63,.32)] transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30">
                <FiSearch />
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
