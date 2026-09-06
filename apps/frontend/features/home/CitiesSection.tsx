import { getTranslations } from "next-intl/server";
import CityCarousel, { type CityCardItem } from "@/features/home/CityCarousel";
import type { DirectoryFilterOption } from "@/lib/api";

const CITY_IMAGES: Record<string, string> = {
  berlin: "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1000&q=82",
  hamburg: "https://images.unsplash.com/photo-1553547274-0df401ae03c9?auto=format&fit=crop&w=1000&q=82",
  munich: "https://images.unsplash.com/photo-1595867818082-083862f3d630?auto=format&fit=crop&w=1000&q=82",
  muenchen: "https://images.unsplash.com/photo-1595867818082-083862f3d630?auto=format&fit=crop&w=1000&q=82",
  cologne: "https://www.klassenfahrten-kluehspies.de/fileadmin/_processed_/8/b/csm_klassenfahrtkc3b6lnccrcphotostock-4036_125d03370a.jpg",
  koeln: "https://www.klassenfahrten-kluehspies.de/fileadmin/_processed_/8/b/csm_klassenfahrtkc3b6lnccrcphotostock-4036_125d03370a.jpg",
  frankfurt: "https://images.unsplash.com/photo-1559564484-e48b3e040ff4?auto=format&fit=crop&w=1000&q=82",
  dusseldorf: "https://images.unsplash.com/photo-1577702312706-e23ff063064f?auto=format&fit=crop&w=1000&q=82",
  duesseldorf: "https://images.unsplash.com/photo-1577702312706-e23ff063064f?auto=format&fit=crop&w=1000&q=82",
  stuttgart: "https://www.stuttgart-tourist.de/images/dz6rwisjidq-/bca286c934a535515333c6e6daedb7f4.jpg",
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
  const featuredItems: CityCardItem[] = cities
    .filter((city) => (city.count ?? 0) > 0)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || a.name.localeCompare(b.name))
    .slice(0, 7)
    .map((city, index) => ({
      id: city.id,
      name: city.name,
      count: city.count ?? 0,
      href: `/directory/cities/${encodeURIComponent(city.slug)}`,
      imageUrl: CITY_IMAGES[city.slug.toLowerCase()] ?? FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
    }));

  if (featuredItems.length === 0) return null;

  const items: CityCardItem[] = [
    ...featuredItems,
    {
      id: "all-cities",
      kind: "all-cities",
      name: t("allCitiesTitle"),
      description: t("allCitiesDescription"),
      href: "/directory",
    },
  ];

  return (
    <section className="relative z-20 -mt-20 pb-8 sm:-mt-24 lg:-mt-28 lg:pb-12" aria-labelledby="cities-title">
      <div className="absolute inset-x-0 bottom-0 top-20 bg-[#f8f5f1] sm:top-24 lg:top-28" aria-hidden="true" />
      <h2 id="cities-title" className="sr-only">{t("title")}</h2>
      <p className="sr-only">{t("description")}</p>
      <div className="relative mx-auto w-full max-w-[1320px] px-5 sm:px-6 lg:px-8 xl:w-[72%]">
        <CityCarousel
          items={items}
          listingLabel={t("listingCount", { count: "{count}" })}
          previousLabel={t("previous")}
          nextLabel={t("next")}
        />
      </div>
    </section>
  );
}
