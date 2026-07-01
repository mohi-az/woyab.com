import { getTranslations } from "next-intl/server";
import CityCarousel, { type CityCardItem } from "@/features/home/CityCarousel";
import type { DirectoryFilterOption } from "@/lib/api";

const CITY_IMAGES: Record<string, string> = {
  berlin: "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1000&q=82",
  hamburg: "https://images.unsplash.com/photo-1553547274-0df401ae03c9?auto=format&fit=crop&w=1000&q=82",
  munich: "https://images.unsplash.com/photo-1595867818082-083862f3d630?auto=format&fit=crop&w=1000&q=82",
  muenchen: "https://images.unsplash.com/photo-1595867818082-083862f3d630?auto=format&fit=crop&w=1000&q=82",
  cologne: "https://images.unsplash.com/photo-1565443689695-2bb10aa02c75?auto=format&fit=crop&w=1000&q=82",
  koeln: "https://images.unsplash.com/photo-1565443689695-2bb10aa02c75?auto=format&fit=crop&w=1000&q=82",
  frankfurt: "https://images.unsplash.com/photo-1559564484-e48b3e040ff4?auto=format&fit=crop&w=1000&q=82",
  dusseldorf: "https://images.unsplash.com/photo-1577702312706-e23ff063064f?auto=format&fit=crop&w=1000&q=82",
  duesseldorf: "https://images.unsplash.com/photo-1577702312706-e23ff063064f?auto=format&fit=crop&w=1000&q=82",
  stuttgart: "https://images.unsplash.com/photo-1594991690894-84f4924b942f?auto=format&fit=crop&w=1000&q=82",
  leipzig: "https://images.unsplash.com/photo-1580746738099-2cb123f11b53?auto=format&fit=crop&w=1000&q=82",
  dresden: "https://images.unsplash.com/photo-1567438210822-8a9d983a1d32?auto=format&fit=crop&w=1000&q=82",
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1000&q=82",
  "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1000&q=82",
  "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&fit=crop&w=1000&q=82",
];

type Props = { cities: DirectoryFilterOption[] };

export default async function CitiesSection({ cities }: Props) {
  const t = await getTranslations("Home.citiesSection");
  const items: CityCardItem[] = cities
    .filter((city) => (city.count ?? 0) > 0)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || a.name.localeCompare(b.name))
    .slice(0, 18)
    .map((city, index) => ({
      id: city.id,
      name: city.name,
      count: city.count ?? 0,
      href: `/businesses?cityId=${city.id}`,
      imageUrl: CITY_IMAGES[city.slug.toLowerCase()] ?? FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
    }));

  if (items.length === 0) return null;

  return (
    <section className="relative z-10 -mt-24 pb-16 lg:-mt-28 lg:pb-22" aria-labelledby="cities-title">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="mb-7 flex flex-col gap-2 text-white sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary-light">{t("eyebrow")}</p>
            <h2 id="cities-title" className="mt-2 text-2xl font-black sm:text-3xl">{t("title")}</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-300">{t("description")}</p>
        </div>
        <CityCarousel
          items={items}
          listingLabel={t("listingCount", { count: "{count}" })}
          previousLabel={t("previous")}
          nextLabel={t("next")}
          slideLabel={t("slideLabel", { number: "{number}" })}
        />
      </div>
    </section>
  );
}
