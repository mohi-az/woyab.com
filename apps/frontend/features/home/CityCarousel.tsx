"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FiArrowLeft, FiArrowRight, FiArrowUpRight } from "react-icons/fi";
import { Link } from "@/i18n/navigation";

export type CityCardItem =
  | {
    id: number;
    name: string;
    count: number;
    href: string;
    imageUrl: string;
    kind?: "city";
  }
  | {
    id: string;
    name: string;
    href: string;
    description: string;
    kind: "all-cities";
  };

type Props = {
  items: CityCardItem[];
  listingLabel: string;
  previousLabel: string;
  nextLabel: string;
};

export default function CityCarousel({ items, listingLabel, previousLabel, nextLabel }: Props) {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
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
      else setPerPage(2);
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

  const renderCard = (item: CityCardItem, eager = false) => {
    if (item.kind === "all-cities") {
      return (
        <Link
          key={item.id}
          href={item.href}
          className="group relative flex h-[11rem] flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(250,204,21,.2),_transparent_42%),linear-gradient(145deg,_#0f172a,_#1e293b_56%,_#0f766e)] p-3 text-white shadow-[0_24px_48px_rgba(15,23,42,.18)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/35 sm:h-[15rem] sm:p-6 lg:h-[15.6rem]"
        >
          <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,.16),transparent_45%,rgba(15,23,42,.22))]" />
          <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border sm:h-12 sm:w-12 sm:rounded-2xl
           border-white/20 bg-white/10 text-lg backdrop-blur-sm transition duration-300 group-hover:scale-105 group-hover:bg-white/15">
            <FiArrowUpRight />
          </div>
          <div className="relative text-center">
            <h3 className="text-lg font-black leading-tight tracking-[-0.03em] sm:text-[2rem]">{item.name}</h3>
            <p className="mx-auto mt-3 hidden max-w-[18rem] text-sm leading-7 text-slate-100/88 sm:block">{item.description}</p>
          </div>
        </Link>
      );
    }

    return (
      <Link
        key={item.id}
        href={item.href}
        className="group relative h-[11rem] overflow-hidden bg-transparent shadow-[0_24px_48px_rgba(15,23,42,.16)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/35 sm:h-[15rem] lg:h-[15.6rem]"
      >
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          priority={eager}
          sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw"
          className="object-cover transition duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,.04)_0%,rgba(15,23,42,.12)_42%,rgba(2,6,23,.86)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 p-3 text-center text-white sm:p-6">
          <h3 className="text-lg font-black leading-tight tracking-[-0.03em] drop-shadow-[0_8px_20px_rgba(0,0,0,.32)] sm:text-[2.05rem] sm:leading-none">{item.name}</h3>
          <p className="mt-2 text-sm font-semibold text-white/92 sm:mt-3 sm:text-lg">{listingLabel.replace("{count}", String(item.count))}</p>
        </div>
      </Link>
    );
  };

  if (!hydrated) {
    return (
      <div aria-hidden="true" className="pointer-events-none overflow-hidden" dir="ltr">
        <div className="grid max-h-[15.6rem] grid-cols-2 gap-3 overflow-hidden md:grid-cols-3 lg:gap-7 xl:grid-cols-4">
          {items.slice(0, 4).map((item, index) => renderCard(item, index < 4))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="group/carousel relative touch-pan-y"
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
      onPointerCancel={() => { startX.current = null; }}
    >
      <div className="overflow-hidden" dir="ltr">
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${safePage * 100}%)` }}>
          {pages.map((pageItems, pageIndex) => (
            <div key={pageIndex} className="grid min-w-full grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:gap-7 xl:grid-cols-4">
              {pageItems.map((item, itemIndex) => renderCard(item, pageIndex === 0 && itemIndex < 4))}
            </div>
          ))}
        </div>
      </div>

      {pages.length > 1 ? (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 top-[45%] hidden -translate-y-1/2 items-center justify-between xl:flex" dir="ltr">
            <button type="button" onClick={() => move(-1)} aria-label={previousLabel} className="pointer-events-auto inline-flex h-12 w-12 -translate-x-3 items-center justify-center rounded-full border-2 border-[#4054d4] bg-white text-2xl text-[#4054d4] shadow-[0_15px_35px_rgba(17,24,39,.16)] transition hover:-translate-x-4 hover:scale-[1.03] hover:bg-[#4054d4] hover:text-white"><FiArrowLeft /></button>
            <button type="button" onClick={() => move(1)} aria-label={nextLabel} className="pointer-events-auto inline-flex h-12 w-12 translate-x-3 items-center justify-center rounded-full border-2 border-[#4054d4] bg-white text-2xl text-[#4054d4] shadow-[0_15px_35px_rgba(17,24,39,.16)] transition hover:translate-x-4 hover:scale-[1.03] hover:bg-[#4054d4] hover:text-white"><FiArrowRight /></button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-3 xl:hidden" dir="ltr">
            <button type="button" onClick={() => move(-1)} aria-label={previousLabel} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#4054d4] bg-white text-xl text-[#4054d4] shadow-[0_10px_24px_rgba(17,24,39,.12)] transition active:scale-95"><FiArrowLeft /></button>
            <span className="min-w-12 text-center text-xs font-bold tabular-nums text-slate-500" aria-hidden="true">{safePage + 1} / {pages.length}</span>
            <button type="button" onClick={() => move(1)} aria-label={nextLabel} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#4054d4] bg-white text-xl text-[#4054d4] shadow-[0_10px_24px_rgba(17,24,39,.12)] transition active:scale-95"><FiArrowRight /></button>
          </div>
        </>
      ) : null}
    </div>
  );
}
