"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const PROMPT_STATE_KEY = "woyab-pwa-install-prompt-state";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIosSafari() {
  const userAgent = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent)
    || (userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return isIos && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
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

  useEffect(() => {
    const syncInstalledState = () => setInstalled(isStandalone());
    syncInstalledState();
    window.addEventListener("appinstalled", syncInstalledState);
    return () => window.removeEventListener("appinstalled", syncInstalledState);
  }, []);

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

    setFeedback(isIosSafari() ? t("iosInstructions") : t("unavailable"));
  }

  return (
    <div className="mt-4 max-w-sm">
      <button
        type="button"
        onClick={() => void install()}
        disabled={installed || installing}
        aria-label={installed ? t("installed") : t("action")}
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
    </div>
  );
}
