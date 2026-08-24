export const COOKIE_CONSENT_STORAGE_KEY = "woyab_cookie_consent";
export const COOKIE_CONSENT_EVENT = "woyab:cookie-consent-change";
export const COOKIE_PREFERENCES_EVENT = "woyab:open-cookie-preferences";

const CONSENT_VERSION = 1;
const CONSENT_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  version: number;
  savedAt: string;
  expiresAt: string;
};

function isStoredConsent(value: unknown): value is CookieConsent {
  if (!value || typeof value !== "object") return false;

  const consent = value as Partial<CookieConsent>;
  return consent.necessary === true
    && typeof consent.analytics === "boolean"
    && typeof consent.marketing === "boolean"
    && consent.version === CONSENT_VERSION
    && typeof consent.savedAt === "string"
    && typeof consent.expiresAt === "string"
    && Date.parse(consent.expiresAt) > Date.now();
}

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = JSON.parse(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) ?? "null");
    if (isStoredConsent(stored)) return stored;
    window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  }

  return null;
}

export function saveCookieConsent(preferences: Pick<CookieConsent, "analytics" | "marketing">): CookieConsent {
  const savedAt = new Date();
  const consent: CookieConsent = {
    necessary: true,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
    version: CONSENT_VERSION,
    savedAt: savedAt.toISOString(),
    expiresAt: new Date(savedAt.getTime() + CONSENT_DURATION_MS).toISOString(),
  };

  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));

  if (!consent.analytics) {
    window.localStorage.removeItem("woyab_analytics_visitor");
    window.localStorage.removeItem("woyab_analytics_session");
    window.localStorage.removeItem("woyab_analytics_session_activity");
  }

  window.dispatchEvent(new CustomEvent<CookieConsent>(COOKIE_CONSENT_EVENT, { detail: consent }));
  return consent;
}

export function onCookieConsentChange(listener: (consent: CookieConsent) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<CookieConsent>).detail);
  window.addEventListener(COOKIE_CONSENT_EVENT, handler);
  return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handler);
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT));
}
