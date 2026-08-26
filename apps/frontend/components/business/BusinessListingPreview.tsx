"use client";

import { useState, useCallback } from "react";
import { FiMapPin, FiPhone, FiGlobe, FiClock, FiTag, FiSliders } from "react-icons/fi";
import { CircularRatingStars } from "@/components/ui/CircularRatingStars";

export type BusinessDraft = {
  locale?: string;
  businessName?: string;
  shortDescription?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  categoryName?: string;
  cityName?: string;
  address?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  email?: string;
  priceRange?: string;
  averageRating?: number;
  reviewCount?: number;
  hours?: Array<{ day: string; open: string; close: string; closed: boolean }>;
  services?: Array<{ title: string; price?: string; currency?: string }>;
  tags?: string[];
  attributeLabels?: string[];
};

function PriceRangeDots({ range }: { range: string }) {
  const levels: Record<string, number> = { BUDGET: 1, MODERATE: 2, EXPENSIVE: 3, LUXURY: 4 };
  const level = levels[range] ?? 0;
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={`h-1.5 w-1.5 rounded-full ${n <= level ? "bg-primary" : "bg-slate-200"}`}
        />
      ))}
    </span>
  );
}

export function BusinessListingPreview({ draft }: { draft: BusinessDraft }) {
  const placeholder = draft.locale === "fa"
    ? { name: "نام کسب‌وکار شما", description: "پس از تکمیل اطلاعات، توضیح کوتاه کسب‌وکار در این بخش نمایش داده می‌شود." }
    : draft.locale === "de"
      ? { name: "Ihr Unternehmensname", description: "Eine kurze Beschreibung Ihres Unternehmens erscheint hier, sobald Sie sie eingeben." }
      : { name: "Your Business Name", description: "A short description of your business will appear here once you fill it in." };
  const name = draft.businessName || placeholder.name;
  const description = draft.shortDescription || draft.description || placeholder.description;
  const hasCover = Boolean(draft.coverImageUrl);
  const hasLogo = Boolean(draft.logoUrl);

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_32px_rgba(15,23,42,0.10)]">
      {/* Cover image */}
      <div
        className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200"
        aria-hidden="true"
      >
        {hasCover ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${draft.coverImageUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[64px] opacity-10">🏢</span>
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Logo + name row */}
      <div className="px-5 pb-1 pt-3">
        <div className="flex items-end gap-3">
          <div
            className={`-mt-10 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white shadow-md ${hasLogo ? "bg-white" : "bg-primary/10"}`}
          >
            {hasLogo ? (
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${draft.logoUrl})` }} />
            ) : (
              <span className="text-2xl font-black text-primary">{name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 pb-1">
            <h3 className="truncate text-base font-black text-slate-950">{name}</h3>
            {draft.categoryName ? (
              <p className="truncate text-xs font-bold text-slate-500">{draft.categoryName}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 px-5 py-2">
        {draft.averageRating ? <CircularRatingStars rating={draft.averageRating} size="xs" /> : null}
        {draft.reviewCount ? (
          <span className="text-xs font-bold text-slate-500">{draft.reviewCount} reviews</span>
        ) : null}
        {draft.priceRange ? <PriceRangeDots range={draft.priceRange} /> : null}
      </div>

      {/* Description */}
      <p className="line-clamp-3 px-5 pb-4 text-sm leading-6 text-slate-600">{description}</p>

      {/* Contact */}
      {(draft.address || draft.cityName || draft.phone || draft.website) ? (
        <div className="space-y-1.5 border-t border-slate-100 px-5 py-3">
          {(draft.address || draft.cityName) ? (
            <div className="flex items-start gap-2">
              <FiMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-xs text-slate-600">
                {[draft.address, draft.cityName].filter(Boolean).join(", ")}
              </span>
            </div>
          ) : null}
          {draft.phone ? (
            <div className="flex items-center gap-2">
              <FiPhone className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-xs text-slate-600">{draft.phone}</span>
            </div>
          ) : null}
          {draft.website ? (
            <div className="flex items-center gap-2">
              <FiGlobe className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate text-xs text-slate-600">{draft.website.replace(/^https?:\/\//, "")}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Hours snippet */}
      {draft.hours && draft.hours.length > 0 ? (
        <div className="border-t border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <FiClock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-slate-700">Opening hours</span>
          </div>
          <div className="mt-1.5 space-y-1">
            {draft.hours.slice(0, 3).map((h, i) => (
              <div key={i} className="flex justify-between text-xs text-slate-500">
                <span className="font-medium">{h.day}</span>
                <span>{h.closed ? "Closed" : `${h.open} – ${h.close}`}</span>
              </div>
            ))}
            {draft.hours.length > 3 ? (
              <p className="text-xs text-slate-400">+{draft.hours.length - 3} more days</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Services snippet */}
      {draft.services && draft.services.length > 0 ? (
        <div className="border-t border-slate-100 px-5 py-3">
          <div className="space-y-1">
            {draft.services.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{s.title}</span>
                {s.price ? (
                  <span className="text-xs text-slate-500">
                    {s.price} {s.currency ?? "EUR"}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Attributes / amenities badges */}
      {draft.attributeLabels && draft.attributeLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-5 py-3">
          <FiSliders className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          {draft.attributeLabels.slice(0, 6).map((label, i) => (
            <span
              key={i}
              className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold text-primary"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {/* Tags */}
      {draft.tags && draft.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-5 py-3">
          <FiTag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          {draft.tags.slice(0, 5).map((tag, i) => (
            <span
              key={i}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* (no footer) */}
    </div>
  );
}

// Hook for managing live draft state
export function useBusinessDraft(initial?: BusinessDraft) {
  const [draft, setDraft] = useState<BusinessDraft>(initial ?? {});

  const updateDraft = useCallback((patch: Partial<BusinessDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  return { draft, updateDraft };
}
