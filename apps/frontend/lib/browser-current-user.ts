"use client";

import type { CurrentUser } from "@/lib/api";

const STORAGE_KEY = "fargo:current-user";

export function getStoredCurrentUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CurrentUser>;
    if (!parsed.id || !parsed.name) return null;
    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email ?? null,
      avatarUrl: parsed.avatarUrl ?? null,
    };
  } catch {
    return null;
  }
}
