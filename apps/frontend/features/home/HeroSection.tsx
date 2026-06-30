"use client";

import { useState } from "react";
import Image from "next/image";
import { FiSearch, FiChevronDown } from "react-icons/fi";
import { MdLocationOn, MdMyLocation } from "react-icons/md";
import { BsGrid3X3Gap } from "react-icons/bs";
import { HiOutlineShoppingBag } from "react-icons/hi";
import { CATEGORIES } from "@/constants";
import type { SearchParams } from "@/types";

const HERO_IMAGES = [
  {
    src: "https://picsum.photos/seed/fargo-office/600/400",
    alt: "Business Office",
  },
  {
    src: "https://picsum.photos/seed/fargo-cowork/600/520",
    alt: "Coworking Space",
  },
  {
    src: "https://picsum.photos/seed/fargo-modern/420/340",
    alt: "Modern Business",
  },
  {
    src: "https://picsum.photos/seed/fargo-city/420/340",
    alt: "City Business",
  },
  {
    src: "https://picsum.photos/seed/fargo-store/420/340",
    alt: "Local Store",
  },
] as const;

/**
 * بخش قهرمان صفحه اصلی
 * شامل: عنوان اصلی، متن توضیح، فرم جستجو و گرید تصاویر
 */
export default function HeroSection() {
  const [search, setSearch] = useState<SearchParams>({});

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: connect search to API route
    const params = new URLSearchParams();
    if (search.query) params.set("q", search.query);
    if (search.category) params.set("category", search.category);
    if (search.location) params.set("location", search.location);
    window.location.href = `/businesses?${params.toString()}`;
  };

  const handleGeoLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setSearch((s) => ({
        ...s,
        location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
      }));
    });
  };

  return (
    <section className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-white">
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center px-4 py-16 lg:py-0">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2">

          <div className="relative isolate flex w-full flex-col gap-7 lg:pr-8">
            {/* شکل‌های تزئینی — بدون overflow-hidden تا کلیپ نشوند؛ section بیرونی کافی است */}
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 -z-10" aria-hidden>
              {/* بلوب نارنجی — پایین-چپ، اندازه معقول */}
              <div className="float-y-slow absolute -bottom-10 -left-10 h-52 w-52 rounded-full bg-orange-100 opacity-55 " />
              {/* مستطیل فیروزه‌ای — بالا، سمت راست محتوا */}
              <div className="float-x-slow absolute right-4 top-6 h-14 w-14 rotate-12 rounded-2xl bg-teal-100 opacity-80" />
              <div className="float-x-slow absolute left-1 top-0 h-14 w-14 rotate-12  bg-sky-100 opacity-80" />
              {/* مستطیل صورتی — وسط، کمی پایین‌تر */}
              <div className="float-y-slower absolute right-16 top-1/2 h-10 w-10 -rotate-6 rounded-2xl bg-pink-100 opacity-80" />
              {/* بلوب آبی — بالا-چپ */}
              <div className="float-x-slower absolute -left-8 top-8 h-44 w-44 rounded-full bg-blue-50 opacity-45 blur-2xl" />
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl xl:text-6xl">
              Are You Looking <br />
              For A Business?
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-gray-500">
              Fargo is the ultimate directory for discovering Iranian-owned businesses
              across Germany — from restaurants and pharmacies to lawyers and beauty salons.
            </p>

            <form onSubmit={handleSearch} className="w-full max-w-2xl">
              <div className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">

                <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-1">
                  <HiOutlineShoppingBag className="shrink-0 text-xl text-primary" />
                  <input
                    type="text"
                    placeholder="I'm Looking for"
                    value={search.query ?? ""}
                    onChange={(e) =>
                      setSearch((s) => ({ ...s, query: e.target.value }))
                    }
                    className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
                  />
                </div>

                <div className="h-8 w-px shrink-0 bg-gray-200" />

                <div className="dropdown dropdown-bottom">
                  <div
                    tabIndex={0}
                    role="button"
                    className="flex cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2"
                  >
                    <BsGrid3X3Gap className="text-lg text-primary" />
                    <span className="text-sm text-gray-600">
                      {search.category
                        ? CATEGORIES.find((c) => c.id === search.category)?.name ?? "Categories"
                        : "Categories"}
                    </span>
                    <FiChevronDown className="text-xs text-gray-400" />
                  </div>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-50 menu mt-1 w-52 rounded-xl border border-gray-100 bg-white p-2 shadow-xl"
                  >
                    <li>
                      <button
                        type="button"
                        className="text-sm text-gray-500 hover:text-primary"
                        onClick={() => setSearch((s) => ({ ...s, category: undefined }))}
                      >
                        All Categories
                      </button>
                    </li>
                    <div className="divider my-1 h-px bg-gray-100" />
                    {CATEGORIES.map((cat) => (
                      <li key={cat.id}>
                        <button
                          type="button"
                          className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary"
                          onClick={() =>
                            setSearch((s) => ({ ...s, category: cat.id }))
                          }
                        >
                          <span>{cat.icon}</span>
                          {cat.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="h-8 w-px shrink-0 bg-gray-200" />

                <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-1">
                  <MdLocationOn className="shrink-0 text-xl text-primary" />
                  <input
                    type="text"
                    placeholder="Location"
                    value={search.location ?? ""}
                    onChange={(e) =>
                      setSearch((s) => ({ ...s, location: e.target.value }))
                    }
                    className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGeoLocation}
                  title="Use my current location"
                  className="btn btn-primary btn-square btn-sm shrink-0 rounded-xl"
                >
                  <MdMyLocation className="text-lg" />
                </button>

                <button
                  type="submit"
                  title="Search"
                  className="btn btn-primary btn-square shrink-0 rounded-xl"
                >
                  <FiSearch className="text-xl" />
                </button>
              </div>
            </form>
          </div>

          <div className="hidden h-130 grid-cols-2 gap-3 lg:grid">
            <div className="flex flex-col gap-3">
              <div className="relative h-48 overflow-hidden rounded-2xl">
                <Image
                  src={HERO_IMAGES[0].src}
                  alt={HERO_IMAGES[0].alt}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  sizes="(max-width: 1280px) 25vw, 300px"
                />
              </div>
              <div className="relative flex-1 overflow-hidden rounded-2xl">
                <Image
                  src={HERO_IMAGES[1].src}
                  alt={HERO_IMAGES[1].alt}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  sizes="(max-width: 1280px) 25vw, 300px"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {HERO_IMAGES.slice(2).map((img) => (
                <div key={img.src} className="relative flex-1 overflow-hidden rounded-2xl">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 1280px) 20vw, 240px"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
