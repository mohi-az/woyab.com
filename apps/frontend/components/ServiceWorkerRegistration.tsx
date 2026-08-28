"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { FiDownload, FiShare, FiX } from "react-icons/fi";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "woyab-pwa-install-dismissed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIosSafari() {
  const userAgent = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent)
    || (userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isIos && isSafari;
}

export function ServiceWorkerRegistration() {
  const t = useTranslations("PwaInstall");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosInstructions, setIosInstructions] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let updateTimer: number | undefined;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        updateTimer = window.setInterval(() => void registration.update(), 60 * 60 * 1000);
      } catch {
        // The website remains usable if service-worker registration is unavailable.
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      window.removeEventListener("load", register);
      if (updateTimer !== undefined) window.clearInterval(updateTimer);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || isStandalone() || sessionStorage.getItem(DISMISSED_KEY) === "1") return;

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIosInstructions(false);
      setVisible(true);
    };
    const handleInstalled = () => {
      setVisible(false);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    let iosTimer: number | undefined;
    if (isIosSafari()) {
      iosTimer = window.setTimeout(() => {
        setIosInstructions(true);
        setVisible(true);
      }, 1800);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      if (iosTimer !== undefined) window.clearTimeout(iosTimer);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setVisible(false);
    if (choice.outcome === "dismissed") sessionStorage.setItem(DISMISSED_KEY, "1");
  }

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      role="dialog"
      aria-label={t("title")}
      className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.24)] sm:inset-x-auto sm:end-5 sm:bottom-5"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <FiX aria-hidden="true" />
      </button>
      <div className="flex items-start gap-3 pe-9">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-xl text-primary">
          {iosInstructions ? <FiShare aria-hidden="true" /> : <FiDownload aria-hidden="true" />}
        </span>
        <div>
          <p className="font-black">{t("title")}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {iosInstructions ? t("iosInstructions") : t("description")}
          </p>
        </div>
      </div>
      {installPrompt ? (
        <button
          type="button"
          onClick={() => void install()}
          className="mt-3 h-11 w-full rounded-xl bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-dark"
        >
          {t("action")}
        </button>
      ) : null}
    </aside>
  );
}
