"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { FiHeart, FiMapPin, FiNavigation } from "react-icons/fi";
import { MdStar, MdStarBorder } from "react-icons/md";
import { CategoryIcon } from "@/lib/business-categories";

export type BusinessCardProps = {
  title: string;
  href?: string;
  imageUrl?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  categoryIconKey?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  location?: string | null;
  shortDescription?: string | null;
  favoriteLabel: string;
  reviewsLabel: string;
  locationFallback: string;
  distanceLabel?: string | null;
  matchedLocationName?: string | null;
};

function RatingStars({ rating = 0 }: { rating?: number | null }) {
  const safeRating = rating ?? 0;
  const rounded = Math.max(0, Math.min(5, Math.round(safeRating)));

  return (
    <div className="flex items-center gap-0.5 text-base text-amber-400 sm:text-[1.05rem]">
      {Array.from({ length: 5 }, (_, index) =>
        index < rounded ? <MdStar key={index} /> : <MdStarBorder key={index} className="text-amber-300" />,
      )}
    </div>
  );
}

export function BusinessCard({
  title,
  href,
  imageUrl,
  categoryName,
  categorySlug,
  categoryIconKey,
  rating,
  reviewCount,
  location,
  shortDescription,
  favoriteLabel,
  reviewsLabel,
  locationFallback,
  distanceLabel,
  matchedLocationName,
}: BusinessCardProps) {
  const content = (
    <>
      <div className="relative aspect-[4/2.7] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="business-card-media h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 via-amber-50 to-teal-100 text-sm font-semibold text-gray-500">
            {categoryName ?? title}
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3 text-sm text-gray-500">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-gray-600">
            <CategoryIcon iconKey={categoryIconKey} categorySlug={categorySlug} className="shrink-0 text-base text-primary" />
            <span className="truncate">{categoryName ?? "-"}</span>
          </span>
        </div>

        <div className="space-y-3">
          <h3 className="line-clamp-2 min-h-[3.4rem] text-[1.05rem] font-extrabold leading-7 text-gray-900 transition-colors duration-200 group-hover:text-primary md:text-[1.15rem]">
            {title}
          </h3>

          {shortDescription ? (
            <p className="line-clamp-1 text-sm text-gray-500">
              {shortDescription}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <RatingStars rating={rating} />
              <span className="font-semibold text-gray-700">({(rating ?? 0).toFixed(1)})</span>
            </div>
            <span>{reviewsLabel.replace("{count}", String(reviewCount ?? 0))}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FiMapPin className="shrink-0 text-base text-primary" />
            <span className="truncate">{location || locationFallback}</span>
          </div>

          {distanceLabel ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FiNavigation className="shrink-0" />
              <span className="truncate">
                {distanceLabel}{matchedLocationName ? ` · ${matchedLocationName}` : ""}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <article className="group relative w-full overflow-hidden rounded-[18px] border border-[#e7dfdb] bg-white shadow-[0_8px_24px_rgba(17,24,39,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(17,24,39,0.10)]">
      <button
        type="button"
        aria-label={favoriteLabel}
        className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-[0_6px_18px_rgba(17,24,39,0.14)] transition-transform duration-200 hover:scale-105"
      >
        <FiHeart className="text-base" />
      </button>

      {href ? (
        <Link href={href} className="block">
          {content}
        </Link>
      ) : (
        <div>{content}</div>
      )}
    </article>
  );
}
