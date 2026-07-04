"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

type DashboardUser = {
  name: string;
  email: string | null;
  avatarUrl: string | null;
};

const links = [
  ["/dashboard", "overview"],
  ["/dashboard/profile", "profile"],
  ["/dashboard/favorites", "favorites"],
  ["/dashboard/addresses", "addresses"],
  ["/dashboard/reviews", "reviews"],
  ["/dashboard/security", "security"],
] as const;

export function DashboardSidebar({ initialUser }: { initialUser: DashboardUser }) {
  const t = useTranslations("Dashboard.sidebar");
  const [user, setUser] = useState(initialUser);
  const displayName = user.name || t("fallbackName");
  const initials = displayName.trim().slice(0, 1).toUpperCase();

  useEffect(() => {
    function updateAvatar(event: Event) {
      const detail = (event as CustomEvent<Partial<DashboardUser>>).detail;
      setUser((current) => ({ ...current, ...detail }));
    }

    window.addEventListener("fargo:profile-updated", updateAvatar);
    return () => window.removeEventListener("fargo:profile-updated", updateAvatar);
  }, []);

  return (
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-28">
      <div className="flex items-center gap-3 border-b border-slate-100 px-3 pb-4">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={displayName} className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/15" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-black text-primary">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-black text-slate-950">{displayName}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
        </div>
      </div>
      <nav className="mt-3 grid grid-cols-2 gap-1 lg:grid-cols-1">
        {links.map(([href, labelKey]) => (
          <Link key={href} href={href} className="rounded-xl px-3 py-3 text-sm font-bold text-slate-600 hover:bg-primary/5 hover:text-primary">
            {t(labelKey)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
