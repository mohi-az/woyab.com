"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { FiMapPin, FiNavigation, FiStar } from "react-icons/fi";
import { MdStar, MdStarBorder } from "react-icons/md";
import { CategoryIcon } from "@/lib/business-categories";
import { FavoriteButton } from "@/components/business/FavoriteButton";
import { Link } from "@/i18n/navigation";
import { getBusinessOpenStatus, type BusinessHour } from "@/lib/business-hours";

export type BusinessCardProps = {
  businessId: string;
  title: string;
  href?: string;
  imageUrl?: string | null;
  fallbackImageUrl?: string | null;
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
  featured?: boolean;
  featuredLabel?: string;
  isFavorite?: boolean;
  onFavoriteChange?: (saved: boolean) => void;
  hours?: BusinessHour[];
  now?: Date;
  openStatusLabels?: Record<"OPEN" | "CLOSED" | "OPEN_SOON" | "CLOSE_SOON", string>;
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
  businessId,
  title,
  href,
  imageUrl,
  fallbackImageUrl,
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
  featured,
  featuredLabel = "Featured",
  isFavorite,
  onFavoriteChange,
  hours = [],
  now = new Date(),
  openStatusLabels,
}: BusinessCardProps) {
  const [failedImageUrls, setFailedImageUrls] = useState<string[]>([]);
  const displayImageUrl = imageUrl && !failedImageUrls.includes(imageUrl)
    ? imageUrl
    : fallbackImageUrl && !failedImageUrls.includes(fallbackImageUrl)
      ? fallbackImageUrl
      : null;
  const openStatus = getBusinessOpenStatus(hours, now);
  const openStatusLabel = openStatus.kind === "UNKNOWN" || !openStatusLabels
    ? null
    : openStatusLabels[openStatus.kind].replace("{time}", openStatus.transitionTime ?? "");
  const openStatusStyle = openStatus.kind === "OPEN"
    ? "bg-emerald-500 text-white"
    : openStatus.kind === "CLOSE_SOON"
      ? "bg-amber-400 text-slate-950"
      : openStatus.kind === "OPEN_SOON"
        ? "bg-sky-500 text-white"
        : "bg-slate-800/85 text-white";

  const content = (
    <>
      <div className="relative aspect-[4/2.75] overflow-hidden bg-slate-100">
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt={title}
            className="business-card-media h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
            onError={() => {
              setFailedImageUrls((current) =>
                current.includes(displayImageUrl) ? current : [...current, displayImageUrl],
              );
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#ffe4dc] via-[#fff7f4] to-slate-100 text-sm font-bold text-slate-500">
            {categoryName ?? title}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
        <span className="absolute bottom-3 start-3 inline-flex max-w-[75%] items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-slate-800 shadow-lg backdrop-blur">
          <CategoryIcon iconKey={categoryIconKey} categorySlug={categorySlug} className="shrink-0 text-sm text-primary" />
          <span className="truncate">{categoryName ?? "-"}</span>
        </span>
        {featured === true ? (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-black text-slate-950 shadow-lg">
            <FiStar className="shrink-0" />
            {featuredLabel}
          </span>
        ) : null}
        {openStatusLabel ? (
          <span className={`absolute end-3 top-3 rounded-full px-3 py-1.5 text-xs font-black shadow-lg ${openStatusStyle}`}>
            {openStatusLabel}
          </span>
        ) : null}
      </div>

      <div className="space-y-3 p-5 sm:p-6">
        <div className="space-y-3">
          <h3 className="line-clamp-2 min-h-[2.6rem] text-[0.75rem] font-black leading-5 text-slate-950 transition-colors duration-200 group-hover:text-primary md:text-[0.8rem]">
            {title}
          </h3>

          {shortDescription ? (
            <p className="line-clamp-1 text-sm leading-6 text-slate-500">
              {shortDescription}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <RatingStars rating={rating} />
              <span className="font-bold text-slate-700">({(rating ?? 0).toFixed(1)})</span>
            </div>
            <span>{reviewsLabel.replace("{count}", String(reviewCount ?? 0))}</span>
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-500">
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
    <article className="group relative w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_10px_32px_rgba(15,23,42,.07)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_48px_rgba(15,23,42,.13)]">
      <FavoriteButton businessId={businessId} label={favoriteLabel} initialSaved={isFavorite} onChange={onFavoriteChange} />

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
