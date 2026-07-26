"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FiAlertCircle, FiClock, FiKey, FiLogIn } from "react-icons/fi";
import { isAppLocale, localizePathname } from "@/i18n/config";
import { Link } from "@/i18n/navigation";

const TOTP_PERIOD = 30; // seconds

function useTotpCountdown() {
  const [remaining, setRemaining] = useState(() => TOTP_PERIOD - (Math.floor(Date.now() / 1000) % TOTP_PERIOD));

  useEffect(() => {
    const tick = () => {
      setRemaining(TOTP_PERIOD - (Math.floor(Date.now() / 1000) % TOTP_PERIOD));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  return remaining;
}

export function TwoFactorVerifyForm({ callbackUrl }: { callbackUrl: string }) {
  const t = useTranslations("Auth.twoFactor");
  const locale = useLocale();
  const activeLocale = isAppLocale(locale) ? locale : "de";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = useTotpCountdown();
  const progress = (remaining / TOTP_PERIOD) * 100;
  const isLow = remaining <= 8;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/two-factor/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      const message: string = result.error || t("error");
      if (response.status === 401) {
        // Session expired — redirect back to login
        window.location.assign(localizePathname(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, activeLocale));
        return;
      }
      setError(message);
      setCode("");
      setLoading(false);
      inputRef.current?.focus();
      return;
    }

    // Success — reload page to pick up the new session, then redirect
    window.location.assign(localizePathname(callbackUrl, activeLocale));
  }

  function handleCodeChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    setError("");
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <FiKey className="text-3xl text-primary" />
        </div>
        <h1 className="mt-4 text-2xl font-black text-slate-950">{t("title")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{t("description")}</p>
      </div>

      {/* TOTP Countdown */}
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <FiClock className={`shrink-0 text-lg transition-colors ${isLow ? "text-amber-500" : "text-slate-400"}`} />
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t("codeExpiry")}</span>
            <span className={`tabular-nums transition-colors ${isLow ? "text-amber-600" : "text-slate-600"}`}>{remaining}s</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isLow ? "bg-amber-400" : "bg-primary"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <FiAlertCircle className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Form */}
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm font-bold text-slate-700">
          {t("codeLabel")}
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="000000"
            dir="ltr"
            className="mt-2 h-14 w-full rounded-xl border border-slate-300 px-4 text-center text-2xl font-black tracking-[0.4em] outline-none transition focus:border-primary disabled:opacity-60"
            disabled={loading}
          />
        </label>

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiLogIn className="text-base" />
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>

      {/* Back link */}
      <p className="mt-5 text-center text-sm text-slate-500">
        {t("wrongAccount")}{" "}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-bold text-primary transition hover:text-primary-dark"
        >
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
