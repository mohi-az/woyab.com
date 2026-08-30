"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { FiCheck, FiX } from "react-icons/fi";
import {
  COOKIE_PREFERENCES_EVENT,
  getCookieConsent,
  saveCookieConsent,
  type CookieConsent as StoredConsent,
} from "@/lib/cookie-consent";

type OptionalPreferences = Pick<StoredConsent, "analytics" | "marketing">;

const rejectedPreferences: OptionalPreferences = { analytics: false, marketing: false };
const subscribeToMount = () => () => undefined;

function PreferenceSwitch({
  checked,
  disabled = false,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div>
        <p className="font-extrabold text-slate-900">{label}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 cursor-pointer rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed ${checked ? "bg-primary" : "bg-slate-300"}`}
      >
        <span className={`absolute top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] shadow-sm transition-[inset-inline-start] ${checked ? "start-6 text-primary" : "start-1 text-slate-400"}`}>
          {checked ? <FiCheck aria-hidden="true" /> : null}
        </span>
      </button>
    </div>
  );
}

export function CookieConsent() {
  const t = useTranslations("CookieConsent");
  const mounted = useSyncExternalStore(subscribeToMount, () => true, () => false);
  const [consent, setConsent] = useState<StoredConsent | null>(() => getCookieConsent());
  const [preferences, setPreferences] = useState<OptionalPreferences>(rejectedPreferences);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const openPreferences = () => {
      const stored = getCookieConsent();
      setPreferences(stored
        ? { analytics: stored.analytics, marketing: stored.marketing }
        : rejectedPreferences);
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPreferencesOpen(true);
    };

    window.addEventListener(COOKIE_PREFERENCES_EVENT, openPreferences);
    return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, openPreferences);
  }, []);

  useEffect(() => {
    if (!preferencesOpen) return;

    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePreferences();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [preferencesOpen]);

  function closePreferences() {
    setPreferencesOpen(false);
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
  }

  function persist(nextPreferences: OptionalPreferences) {
    const nextConsent = saveCookieConsent(nextPreferences);
    setConsent(nextConsent);
    setPreferences(nextPreferences);
    setPreferencesOpen(false);
  }

  if (!mounted) return null;

  return (
    <>
      {!consent && !preferencesOpen ? (
        <section
          aria-labelledby="cookie-consent-title"
          className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,.24)] sm:inset-x-5 sm:bottom-5 sm:p-5 lg:flex lg:items-center lg:gap-8 lg:px-6"
        >
          <div className="min-w-0 flex-1">
            <h2 id="cookie-consent-title" className="text-base font-black text-slate-950 sm:text-lg">{t("bannerTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{t("bannerDescription")}</p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:mt-0 lg:w-auto lg:min-w-[510px]">
            <button type="button" onClick={() => persist({ analytics: true, marketing: true })} className="min-h-11 cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              {t("acceptAll")}
            </button>
            <button type="button" onClick={() => persist(rejectedPreferences)} className="min-h-11 cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-extrabold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              {t("rejectAll")}
            </button>
            <button type="button" onClick={(event) => { previousFocusRef.current = event.currentTarget; setPreferences(rejectedPreferences); setPreferencesOpen(true); }} className="min-h-11 cursor-pointer rounded-xl border border-slate-300 bg-slate-100 px-5 py-2.5 text-sm font-extrabold text-slate-800 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              {t("manage")}
            </button>
          </div>
        </section>
      ) : null}

      {preferencesOpen ? (
        <div className="fixed inset-0 z-[110] grid items-end bg-slate-950/60 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) closePreferences(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="cookie-preferences-title" aria-describedby="cookie-preferences-description" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-slate-50 shadow-2xl sm:max-w-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 id="cookie-preferences-title" className="text-xl font-black text-slate-950">{t("preferencesTitle")}</h2>
                <p id="cookie-preferences-description" className="mt-1 text-sm leading-6 text-slate-600">{t("preferencesDescription")}</p>
              </div>
              <button ref={closeButtonRef} type="button" onClick={closePreferences} aria-label={t("close")} className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl text-xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <FiX aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 p-4 sm:p-6">
              <PreferenceSwitch checked disabled label={t("necessaryTitle")} description={t("necessaryDescription")} />
              <PreferenceSwitch checked={preferences.analytics} onChange={(analytics) => setPreferences((current) => ({ ...current, analytics }))} label={t("analyticsTitle")} description={t("analyticsDescription")} />
              <PreferenceSwitch checked={preferences.marketing} onChange={(marketing) => setPreferences((current) => ({ ...current, marketing }))} label={t("marketingTitle")} description={t("marketingDescription")} />
            </div>

            <div className="sticky bottom-0 grid gap-2 border-t border-slate-200 bg-white p-4 sm:grid-cols-2 sm:px-6">
              <button type="button" onClick={() => persist(preferences)} className="min-h-12 cursor-pointer rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white transition hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                {t("save")}
              </button>
              <button type="button" onClick={() => persist(rejectedPreferences)} className="min-h-12 cursor-pointer rounded-xl border border-slate-300 px-5 py-3 text-sm font-extrabold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                {t("rejectAll")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
