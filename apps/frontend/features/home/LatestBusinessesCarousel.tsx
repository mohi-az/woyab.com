"use client";

import { useEffect, useMemo, useState } from "react";
import { BusinessCard, type BusinessCardProps } from "@/components/business/BusinessCard";

type LatestBusinessesCarouselProps = {
  items: Array<BusinessCardProps & { id: string }>;
};

export default function LatestBusinessesCarousel({ items }: LatestBusinessesCarouselProps) {
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(1);

  useEffect(() => {
    function updateItemsPerPage() {
      if (window.innerWidth >= 1024) {
        setItemsPerPage(4);
        return;
      }

      if (window.innerWidth >= 768) {
        setItemsPerPage(2);
        return;
      }

      setItemsPerPage(1);
    }

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);

    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  const pages = useMemo(() => {
    const result: Array<Array<BusinessCardProps & { id: string }>> = [];

    for (let index = 0; index < items.length; index += itemsPerPage) {
      result.push(items.slice(index, index + itemsPerPage));
    }

    return result;
  }, [items, itemsPerPage]);
  const safeActivePage = Math.min(activePage, Math.max(pages.length - 1, 0));

  return (
    <div className="space-y-7 overflow-x-hidden">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${safeActivePage * 100}%)` }}
        >
          {pages.map((pageItems, pageIndex) => (
            <div
              key={`page-${pageIndex}`}
              className="grid min-w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
            >
              {pageItems.map((item) => (
                <BusinessCard key={item.id} {...item} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {pages.length > 1 ? (
        <div className="flex items-center justify-center gap-3">
          {pages.map((_, pageIndex) => {
            const isActive = pageIndex === safeActivePage;

            return (
              <button
                key={`dot-${pageIndex}`}
                type="button"
                onClick={() => setActivePage(pageIndex)}
                aria-label={`Go to slide ${pageIndex + 1}`}
                aria-pressed={isActive}
                className={`h-4 rounded-full transition-all duration-300 ${
                  isActive ? "w-10 bg-primary" : "w-4 bg-gray-300 hover:bg-gray-400"
                }`}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
