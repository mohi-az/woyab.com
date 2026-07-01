"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiMapPin } from "react-icons/fi";

export type CityCardItem = {
  id: number;
  name: string;
  count: number;
  href: string;
  imageUrl: string;
};

type Props = {
  items: CityCardItem[];
  listingLabel: string;
  previousLabel: string;
  nextLabel: string;
  slideLabel: string;
};

export default function CityCarousel({ items, listingLabel, previousLabel, nextLabel, slideLabel }: Props) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(1);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (window.innerWidth >= 1280) setPerPage(4);
      else if (window.innerWidth >= 768) setPerPage(3);
      else if (window.innerWidth >= 520) setPerPage(2);
      else setPerPage(1);
    };
    update();
    window.addEventListener("resize", update);
    const onMotionChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    media.addEventListener("change", onMotionChange);
    return () => {
      window.removeEventListener("resize", update);
      media.removeEventListener("change", onMotionChange);
    };
  }, []);

  const pages = useMemo(() => {
    const result: CityCardItem[][] = [];
    for (let index = 0; index < items.length; index += perPage) result.push(items.slice(index, index + perPage));
    return result;
  }, [items, perPage]);
  const safePage = Math.min(page, Math.max(0, pages.length - 1));
  const move = useCallback((direction: number) => {
    setPage((current) => {
      const total = Math.max(1, pages.length);
      return (Math.min(current, total - 1) + direction + total) % total;
    });
  }, [pages.length]);

  useEffect(() => {
    if (interactionPaused || reduceMotion || pages.length <= 1) return;
    const timer = window.setInterval(() => move(1), 5200);
    return () => window.clearInterval(timer);
  }, [interactionPaused, move, pages.length, reduceMotion]);

  return (
    <div
      className="group/carousel"
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={() => setInteractionPaused(false)}
      onPointerDown={(event) => { startX.current = event.clientX; }}
      onPointerUp={(event) => {
        if (startX.current === null) return;
        const distance = event.clientX - startX.current;
        if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1);
        startX.current = null;
      }}
    >
      <div className="overflow-hidden rounded-2xl" dir="ltr">
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${safePage * 100}%)` }}>
          {pages.map((pageItems, pageIndex) => (
            <div key={pageIndex} className="grid min-w-full gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {pageItems.map((city) => (
                <Link key={city.id} href={city.href} className="group relative h-72 overflow-hidden rounded-2xl bg-slate-800 shadow-[0_18px_45px_rgba(15,23,42,.18)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/35">
                  <Image src={city.imageUrl} alt={city.name} fill sizes="(max-width: 519px) 100vw, (max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw" className="object-cover transition duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm"><FiMapPin /></span>
                    <h3 className="text-xl font-black">{city.name}</h3>
                    <p className="mt-1 text-sm text-slate-200">{listingLabel.replace("{count}", String(city.count))}</p>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      {pages.length > 1 ? (
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex gap-2" dir="ltr">
            <button type="button" onClick={() => move(-1)} aria-label={previousLabel} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-primary hover:bg-primary hover:text-white"><FiArrowLeft /></button>
            <button type="button" onClick={() => move(1)} aria-label={nextLabel} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-primary hover:bg-primary hover:text-white"><FiArrowRight /></button>
          </div>
          <div className="flex items-center gap-2">
            {pages.map((_, index) => <button key={index} type="button" onClick={() => setPage(index)} aria-label={slideLabel.replace("{number}", String(index + 1))} aria-current={index === safePage ? "true" : undefined} className={`h-2.5 rounded-full transition-all ${index === safePage ? "w-8 bg-primary" : "w-2.5 bg-slate-300 hover:bg-slate-400"}`} />)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
