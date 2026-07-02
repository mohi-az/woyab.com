"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiHeart } from "react-icons/fi";

export function FavoriteButton({ businessId, label, initialSaved = false, onChange }: { businessId: string; label: string; initialSaved?: boolean; onChange?: (saved: boolean) => void }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  useEffect(() => setSaved(initialSaved), [initialSaved]);
  return <button type="button" aria-label={label} aria-pressed={saved} disabled={loading} onClick={async () => {
    setLoading(true);
    const response = await fetch(`/api/account/favorites/${businessId}`, { method: saved ? "DELETE" : "PUT" });
    if (response.status === 401) router.push("/login");
    else if (response.ok) setSaved((value) => {
      const next = !value;
      onChange?.(next);
      return next;
    });
    setLoading(false);
  }} className={`absolute end-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full shadow-[0_6px_18px_rgba(17,24,39,.16)] backdrop-blur transition hover:scale-105 disabled:opacity-60 ${saved ? "bg-rose-600 text-white" : "bg-white/95 text-primary hover:bg-rose-600 hover:text-white"}`}>
    <FiHeart className={saved ? "fill-current text-base" : "text-base"} />
  </button>;
}
