"use client";

import { openCookiePreferences } from "@/lib/cookie-consent";

export function CookiePreferencesButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={openCookiePreferences} className="cursor-pointer transition hover:text-white focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
      {label}
    </button>
  );
}
