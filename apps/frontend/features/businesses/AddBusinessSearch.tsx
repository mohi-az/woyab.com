"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { FiArrowLeft, FiArrowRight, FiBriefcase, FiPlus, FiSearch } from "react-icons/fi";
import { isAppLocale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";

type SearchItem = {
  id: string;
  slug: string;
  title: string;
};

export function AddBusinessSearch() {
  const t = useTranslations("AddBusinessPage");
  const locale = useLocale();
  const activeLocale = isAppLocale(locale) ? locale : "de";
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const normalizedQuery = query.trim();
  const ArrowIcon = activeLocale === "fa" ? FiArrowLeft : FiArrowRight;

  useEffect(() => {
    const controller = new AbortController();
    if (normalizedQuery.length < 2) {
      return () => controller.abort();
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/businesses/claim-search?q=${encodeURIComponent(normalizedQuery)}&locale=${activeLocale}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await response.json().catch(() => null) as { data?: { items?: SearchItem[] } } | null;
        if (!response.ok) throw new Error("Search failed");
        setItems(result?.data?.items ?? []);
      } catch (searchError) {
        if ((searchError as Error).name !== "AbortError") {
          setItems([]);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeLocale, normalizedQuery]);

  const newBusinessPath = `/dashboard/owner/new?businessName=${encodeURIComponent(normalizedQuery)}`;
  const addHref = session?.user
    ? newBusinessPath
    : `/login?callbackUrl=${encodeURIComponent(newBusinessPath)}`;

  return (
    <div className="h-[calc(100dvh-4rem)] overflow-hidden bg-white lg:h-[calc(100dvh-4.75rem)]">
      <div className="grid h-full min-h-0 lg:grid-cols-2">
        <section className="relative z-10 h-full min-h-0 overflow-hidden px-5 py-6 sm:px-10 sm:py-8 lg:px-14 xl:px-20 xl:py-10">
          <div className="mx-auto flex h-full min-h-0 max-w-2xl flex-col">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-primary">{t("eyebrow")}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t("title")}</h1>
            <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">{t("description")}</p>

            <div className="mt-6 shrink-0">
              <label htmlFor="business-name-search" className="mb-2 block text-sm font-black text-slate-800">{t("fieldLabel")}</label>
              <div className="flex min-h-14 overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <input
                  id="business-name-search"
                  type="search"
                  autoComplete="organization"
                  value={query}
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    setQuery(nextQuery);
                    setItems([]);
                    setLoading(nextQuery.trim().length >= 2);
                    setError(false);
                  }}
                  placeholder={t("placeholder")}
                  className="min-w-0 flex-1 bg-transparent px-4 text-base font-medium text-slate-950 outline-none placeholder:text-slate-400"
                />
                <span className="grid w-16 shrink-0 place-items-center border-slate-200 bg-slate-50 text-xl text-slate-700 ltr:border-l rtl:border-r" aria-hidden="true">
                  <FiSearch />
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{t("searchHint")}</p>
            </div>

            {normalizedQuery.length >= 2 ? (
              <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]" aria-live="polite">
                <Link
                  href={addHref}
                  className="group flex shrink-0 items-center gap-4 border-b border-slate-100 px-5 py-3.5 transition hover:bg-primary/5"
                >
                  <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-xl text-primary">
                    <FiBriefcase />
                    <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-primary text-xs text-white rtl:-left-1 rtl:right-auto"><FiPlus /></span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-base text-slate-950">{normalizedQuery}</strong>
                    <span className="mt-1 block text-sm text-slate-500">{t("addWithName")}</span>
                  </span>
                  <ArrowIcon className="shrink-0 text-lg text-slate-400 transition group-hover:translate-x-1 group-hover:text-primary rtl:group-hover:-translate-x-1" />
                </Link>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {loading ? <p className="px-5 py-6 text-center text-sm font-bold text-slate-500">{t("loading")}</p> : null}
                  {error ? <p className="px-5 py-6 text-center text-sm font-bold text-rose-600">{t("error")}</p> : null}
                  {!loading && !error && items.map((item) => (
                    <Link key={item.id} href={`/businesses/${item.slug}?claim=1`} className="group flex items-center gap-4 border-b border-slate-100 px-5 py-3.5 transition last:border-b-0 hover:bg-slate-50">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg text-slate-600"><FiBriefcase /></span>
                      <strong className="min-w-0 flex-1 truncate text-base text-slate-900">{item.title}</strong>
                      <ArrowIcon className="shrink-0 text-lg text-slate-400 transition group-hover:translate-x-1 group-hover:text-primary rtl:group-hover:-translate-x-1" />
                    </Link>
                  ))}
                  {!loading && !error && items.length === 0 ? <p className="px-5 py-5 text-center text-sm text-slate-500">{t("noMatches")}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="relative hidden h-full min-h-0 overflow-hidden bg-[#f7f5f1] lg:block">
          <Image
            src="/images/add-business-discovery-hero.png"
            alt={t("imageAlt")}
            fill
            priority
            sizes="50vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-x-10 bottom-12 xl:inset-x-16 xl:bottom-16">
            <div className="max-w-xl rounded-[28px] border border-white/70 bg-white/94 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-md xl:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">{t("artworkEyebrow")}</p>
              <p className="mt-3 text-2xl font-black leading-tight text-slate-950 xl:text-3xl">{t("artworkMessage")}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
