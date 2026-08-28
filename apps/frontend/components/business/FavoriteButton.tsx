"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { FiHeart } from "react-icons/fi";
import { isAppLocale, localizePathname, stripLocalePrefix } from "@/i18n/config";

type Props = {
  businessId: string;
  label: string;
  savedLabel?: string;
  initialSaved?: boolean;
  checkInitialSaved?: boolean;
  variant?: "card" | "hero";
  onChange?: (saved: boolean) => void;
};

export function FavoriteButton({
  businessId,
  label,
  savedLabel,
  initialSaved = false,
  checkInitialSaved = false,
  variant = "card",
  onChange,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(checkInitialSaved);
  const activeLocale = isAppLocale(locale) ? locale : "de";
  const currentSearch = searchParams.toString();
  const callbackPath = `${stripLocalePrefix(pathname)}${currentSearch ? `?${currentSearch}` : ""}`;
  const loginHref = localizePathname(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`, activeLocale);

  useEffect(() => {
    if (!checkInitialSaved) return;
    const controller = new AbortController();

    void fetch("/api/account/directory-context", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!controller.signal.aborted) {
          setSaved(Boolean(result?.data?.favoriteBusinessIds?.includes(businessId)));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [businessId, checkInitialSaved]);

  const accessibleLabel = saved ? (savedLabel ?? label) : label;
  const positionAndColor = variant === "hero"
    ? saved
      ? "border-rose-300/40 bg-rose-500/25 text-rose-100 hover:bg-rose-500/35"
      : "border-white/20 bg-white/10 text-white hover:border-rose-300/50 hover:bg-rose-500/25 hover:text-rose-100"
    : saved
      ? "absolute end-3 top-14 z-10 bg-rose-600 text-white"
      : "absolute end-3 top-14 z-10 bg-white/95 text-primary hover:bg-rose-600 hover:text-white";

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      title={accessibleLabel}
      aria-pressed={saved}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/account/favorites/${businessId}`, { method: saved ? "DELETE" : "PUT" });
          if (response.status === 401) router.push(loginHref);
          else if (response.ok) setSaved((value) => {
            const next = !value;
            onChange?.(next);
            return next;
          });
        } finally {
          setLoading(false);
        }
      }}
      className={`inline-flex items-center justify-center rounded-full border shadow-[0_6px_18px_rgba(17,24,39,.16)] backdrop-blur transition hover:scale-105 disabled:cursor-wait disabled:opacity-60 ${variant === "hero" ? "h-11 w-11 shrink-0" : "h-10 w-10 border-transparent"} ${positionAndColor}`}
    >
      <FiHeart aria-hidden="true" className={saved ? "fill-current text-lg" : "text-lg"} />
    </button>
  );
}
