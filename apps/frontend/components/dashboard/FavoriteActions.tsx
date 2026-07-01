"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveFavoriteButton({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return <button disabled={loading} onClick={async () => {
    setLoading(true);
    await fetch(`/api/account/favorites/${businessId}`, { method: "DELETE" });
    router.refresh();
  }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50">حذف</button>;
}
