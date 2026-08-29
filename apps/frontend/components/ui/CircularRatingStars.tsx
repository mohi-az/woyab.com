"use client";

import clsx from "clsx";

type RatingSize = "xs" | "sm" | "md" | "lg";

const THIRD_STAR_PRECISION = 1 / 3;

const dimensions: Record<RatingSize, number> = {
  xs: 16,
  sm: 20,
  md: 26,
  lg: 32,
};

type BadgeProps = {
  fill: number;
  size: RatingSize;
};

function StarBadgeArtwork({ filled, dimension }: { filled: boolean; dimension: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={dimension}
      height={dimension}
      aria-hidden="true"
      className="block max-w-none"
    >
      <circle cx="12" cy="12" r="11.5" fill={filled ? "#ff9f0a" : "#a3a3a3"} />
      <path
        d="m12 3.25 2.7 5.47 6.04.88-4.37 4.26 1.03 6.02L12 17.04l-5.4 2.84 1.03-6.02L3.26 9.6l6.04-.88L12 3.25Z"
        fill={filled ? "#ffec00" : "#e7e7e7"}
      />
    </svg>
  );
}

function RatingBadge({ fill, size }: BadgeProps) {
  const dimension = dimensions[size];
  const safeFill = Math.max(0, Math.min(1, fill));

  return (
    <span className="relative block shrink-0" style={{ width: dimension, height: dimension }}>
      <StarBadgeArtwork filled={false} dimension={dimension} />
      {safeFill > 0 ? (
        <span className="absolute inset-y-0 start-0 overflow-hidden" style={{ width: `${safeFill * 100}%` }}>
          <StarBadgeArtwork filled dimension={dimension} />
        </span>
      ) : null}
    </span>
  );
}

type CircularRatingStarsProps = {
  rating: number;
  max?: number;
  size?: RatingSize;
  precision?: number;
  label?: string;
  className?: string;
};

export function CircularRatingStars({
  rating,
  max = 5,
  size = "sm",
  precision = THIRD_STAR_PRECISION,
  label,
  className,
}: CircularRatingStarsProps) {
  const safeRating = Number.isFinite(rating) ? Math.max(0, Math.min(max, rating)) : 0;
  const safePrecision = Number.isFinite(precision) && precision > 0 ? precision : THIRD_STAR_PRECISION;
  const normalizedRating = Math.min(max, Math.round(safeRating / safePrecision) * safePrecision);

  return (
    <span
      role="img"
      aria-label={label ?? `${safeRating} / ${max}`}
      className={clsx("inline-flex items-center gap-1", className)}
    >
      {Array.from({ length: max }, (_, index) => (
        <RatingBadge key={index} size={size} fill={normalizedRating - index} />
      ))}
    </span>
  );
}

type CircularRatingInputProps = {
  value: number;
  onChange: (value: number) => void;
  getLabel: (value: number) => string;
  size?: RatingSize;
  className?: string;
};

export function CircularRatingInput({ value, onChange, getLabel, size = "lg", className }: CircularRatingInputProps) {
  return (
    <div role="radiogroup" className={clsx("flex flex-wrap items-center gap-1", className)}>
      {Array.from({ length: 5 }, (_, index) => {
        const option = index + 1;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            aria-label={getLabel(option)}
            onClick={() => onChange(option)}
            className="grid min-h-11 min-w-11 place-items-center rounded-full transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/25"
          >
            <RatingBadge size={size} fill={option <= value ? 1 : 0} />
          </button>
        );
      })}
    </div>
  );
}
