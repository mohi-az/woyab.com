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
  const [observedInitialSaved, setObservedInitialSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(checkInitialSaved);
  const activeLocale = isAppLocale(locale) ? locale : "de";
  const currentSearch = searchParams.toString();
  const callbackPath = `${stripLocalePrefix(pathname)}${currentSearch ? `?${currentSearch}` : ""}`;
  const loginHref = localizePathname(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`, activeLocale);

  if (observedInitialSaved !== initialSaved) {
    setObservedInitialSaved(initialSaved);
    setSaved(initialSaved);
  }

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
  const iconColor = variant === "card"
    ? saved ? "#ffffff" : "var(--color-primary)"
    : saved ? "var(--color-primary)" : "#ffffff";
  const positionAndColor = variant === "hero"
    ? saved
      ? "border-primary-light/80 bg-white text-primary ring-2 ring-primary/25 hover:border-primary hover:bg-white"
      : "border-white/60 bg-slate-950/55 text-white ring-2 ring-white/15 hover:border-primary-light hover:bg-primary/90"
    : saved
      ? "absolute right-3 top-3 z-10 border-primary bg-primary text-white hover:border-primary-dark hover:bg-primary-dark"
      : "absolute right-3 top-3 z-10 border-white/80 bg-white/95 text-primary hover:border-primary hover:bg-white hover:text-primary-dark";

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
          else if (response.ok) {
            const next = !saved;
            setSaved(next);
            onChange?.(next);
          }
        } finally {
          setLoading(false);
        }
      }}
      className={`inline-flex cursor-pointer items-center justify-center rounded-full border backdrop-blur transition duration-200 hover:scale-110 hover:shadow-[0_10px_24px_rgba(15,23,42,.24)] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:cursor-wait disabled:opacity-60 ${variant === "hero" ? "h-11 w-11 shrink-0 shadow-[0_8px_24px_rgba(0,0,0,.28)] lg:h-14 lg:w-14" : "h-10 w-10 shadow-[0_6px_18px_rgba(17,24,39,.16)]"} ${positionAndColor}`}
    >
      <FiHeart
        aria-hidden="true"
        fill={saved ? iconColor : "none"}
        stroke={iconColor}
        style={{ color: iconColor }}
        className={`text-lg ${variant === "hero" ? "lg:text-2xl" : ""}`}
      />
    </button>
  );
}
