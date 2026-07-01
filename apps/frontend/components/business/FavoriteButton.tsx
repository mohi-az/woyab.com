"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiHeart } from "react-icons/fi";

export function FavoriteButton({ businessId, label }: { businessId: string; label: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  return <button type="button" aria-label={label} aria-pressed={saved} disabled={loading} onClick={async () => {
    setLoading(true);
    const response = await fetch(`/api/account/favorites/${businessId}`, { method: saved ? "DELETE" : "PUT" });
    if (response.status === 401) router.push("/login");
    else if (response.ok) setSaved((value) => !value);
    setLoading(false);
  }} className={`absolute end-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full shadow-[0_6px_18px_rgba(17,24,39,.16)] backdrop-blur transition hover:scale-105 disabled:opacity-60 ${saved ? "bg-primary text-white" : "bg-white/95 text-primary hover:bg-primary hover:text-white"}`}>
    <FiHeart className={saved ? "fill-current text-base" : "text-base"} />
  </button>;
}
