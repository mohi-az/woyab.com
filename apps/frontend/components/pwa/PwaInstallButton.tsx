"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { FiCheck, FiPlusSquare, FiShare, FiX } from "react-icons/fi";

const PROMPT_STATE_KEY = "woyab-pwa-install-prompt-state";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIosDevice() {
  const userAgent = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(userAgent)
    || (userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function rememberInstallState(state: "dismissed" | "installed") {
  try {
    window.localStorage.setItem(PROMPT_STATE_KEY, state);
  } catch {
    // Installation can continue when storage is unavailable.
  }
}

export function PwaInstallButton() {
  const t = useTranslations("PwaInstall");
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showIosGuide, setShowIosGuide] = useState(false);
  const installButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const syncInstalledState = () => setInstalled(isStandalone());
    syncInstalledState();
    window.addEventListener("appinstalled", syncInstalledState);
    return () => window.removeEventListener("appinstalled", syncInstalledState);
  }, []);

  useEffect(() => {
    if (!showIosGuide) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeIosGuide();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showIosGuide]);

  function closeIosGuide() {
    setShowIosGuide(false);
    window.requestAnimationFrame(() => installButtonRef.current?.focus());
  }

  async function install() {
    if (installed || installing) return;
    setFeedback("");

    const prompt = window.__woyabPwaInstallPrompt;
    if (prompt) {
      setInstalling(true);
      await prompt.prompt();
      const choice = await prompt.userChoice;
      delete window.__woyabPwaInstallPrompt;
      window.dispatchEvent(new Event("woyab:pwa-install-finished"));
      rememberInstallState(choice.outcome === "accepted" ? "installed" : "dismissed");
      setInstalling(false);
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setFeedback(t("installed"));
      }
      return;
    }

    if (isIosDevice()) {
      setShowIosGuide(true);
      return;
    }

    setFeedback(t("unavailable"));
  }

  return (
    <div className="mt-4 max-w-sm">
      <button
        ref={installButtonRef}
        type="button"
        onClick={() => void install()}
        disabled={installed || installing}
        className="group inline-flex min-h-[78px] w-full max-w-[22rem] cursor-pointer items-center gap-4 rounded-2xl border-2 border-slate-400 bg-black px-4 py-3 text-start text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition hover:border-white hover:shadow-[0_10px_30px_rgba(0,0,0,0.34)] disabled:cursor-default disabled:opacity-70"
      >
        <span className="shrink-0 text-[2rem] font-black leading-none tracking-[-0.16em]" dir="ltr" aria-hidden="true">
          <span className="text-white">P</span>
          <span className="text-violet-500">W</span>
          <span className="text-white">A</span>
        </span>
        <span className="h-11 w-px shrink-0 bg-white/25" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-300">{t("mobileLabel")}</span>
          <span className="mt-0.5 block text-xl font-black leading-tight text-white">
            {installed ? t("installed") : installing ? t("installing") : t("action")}
          </span>
        </span>
      </button>
      {feedback ? <p className="mt-2 text-xs leading-5 text-slate-300" role="status">{feedback}</p> : null}

      {showIosGuide ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeIosGuide();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            aria-describedby="ios-install-description"
            className="w-full max-w-md rounded-[1.75rem] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 text-start text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.35)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">WoYab PWA</p>
                <h2 id="ios-install-title" className="mt-1 text-xl font-black">{t("iosGuideTitle")}</h2>
                <p id="ios-install-description" className="mt-2 text-sm leading-6 text-slate-600">
                  {t("iosInstructions")}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeIosGuide}
                aria-label={t("close")}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <FiX className="text-xl" aria-hidden="true" />
              </button>
            </div>

            <ol className="mt-5 space-y-3">
              <li className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-xl text-sky-700">
                  <FiShare aria-hidden="true" />
                </span>
                <div>
                  <p className="font-black">{t("iosStepShareTitle")}</p>
                  <p className="mt-0.5 text-sm leading-5 text-slate-600">{t("iosStepShareDescription")}</p>
                </div>
              </li>
              <li className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-xl text-violet-700">
                  <FiPlusSquare aria-hidden="true" />
                </span>
                <div>
                  <p className="font-black">{t("iosStepHomeTitle")}</p>
                  <p className="mt-0.5 text-sm leading-5 text-slate-600">{t("iosStepHomeDescription")}</p>
                </div>
              </li>
              <li className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-xl text-emerald-700">
                  <FiCheck aria-hidden="true" />
                </span>
                <div>
                  <p className="font-black">{t("iosStepAddTitle")}</p>
                  <p className="mt-0.5 text-sm leading-5 text-slate-600">{t("iosStepAddDescription")}</p>
                </div>
              </li>
            </ol>

            <button
              type="button"
              onClick={closeIosGuide}
              className="mt-5 h-12 w-full rounded-xl bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t("iosGuideDone")}
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
