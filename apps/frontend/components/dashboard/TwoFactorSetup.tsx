"use client";

import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { FiAlertTriangle, FiCheckCircle, FiKey, FiShield, FiXCircle } from "react-icons/fi";
import { QRCodeSVG } from "qrcode.react";
import { isAppLocale, localizePathname } from "@/i18n/config";

type SetupStep = "idle" | "auth" | "scan" | "enabled";

export function TwoFactorSetup({ enabled, hasPassword }: { enabled: boolean; hasPassword: boolean }) {
  const t = useTranslations("Dashboard.security.twoFactor");
  const locale = useLocale();
  const activeLocale = isAppLocale(locale) ? locale : "de";

  const [step, setStep] = useState<SetupStep>(enabled ? "enabled" : "idle");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  async function startSetup(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!hasPassword) {
      if (newPassword !== confirmPassword) {
        setError(t("wizard.passwordMismatch"));
        return;
      }
      if (newPassword.length < 10) {
        setError(t("wizard.passwordTooShort"));
        return;
      }
    }

    setPending(true);

    const payload = hasPassword ? { password } : { newPassword };

    const response = await fetch("/api/auth/two-factor/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (result.errorCode === "incorrectPassword" || result.error === "Current password is incorrect.") {
        setError(t("wizard.passwordMismatch")); // Or a dedicated translation if exists
      } else if (result.errorCode === "passwordTooShort") {
        setError(t("wizard.passwordTooShort"));
      } else {
        setError(result.error || t("errors.startFailed"));
      }
      setPending(false);
      return;
    }

    setSecret(result.secret);
    setUri(result.uri);
    setStep("scan");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPending(false);
  }

  async function confirmSetup(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/auth/two-factor/setup", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (result.errorCode === "invalidCode" || result.error === "The verification code is invalid.") {
        setError(t("errors.invalidCode"));
      } else {
        setError(result.error || t("errors.invalidCode"));
      }
      setPending(false);
      return;
    }

    // Sign out to create a fresh session with twoFactorVerified = true
    await signOut({ redirectTo: localizePathname("/login?twoFactor=enabled", activeLocale) });
  }

  async function disableTwoFactor(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/auth/two-factor/setup", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: disablePassword }),
    });

    const result = await response.json();
    if (!response.ok) {
      setError(result.error || t("errors.disableFailed"));
      setPending(false);
      return;
    }

    // Refresh session
    window.location.reload();
  }

  // --- Enabled state ---
  if (step === "enabled" || enabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <FiCheckCircle className="mt-0.5 shrink-0 text-xl text-emerald-600" />
          <div>
            <p className="font-bold text-emerald-800">{t("enabledTitle")}</p>
            <p className="mt-1 text-sm text-emerald-700">{t("enabledDescription")}</p>
          </div>
        </div>

        {!showDisable ? (
          <button
            type="button"
            onClick={() => { setShowDisable(true); setError(""); }}
            className="rounded-xl border border-red-300 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
          >
            {t("disable")}
          </button>
        ) : (
          <form onSubmit={disableTwoFactor} className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-2">
              <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-sm font-bold text-red-800">{t("disableWarning")}</p>
            </div>
            <label className="block text-sm font-bold text-red-800">
              {t("passwordLabel")}
              <input
                type="password"
                required
                autoComplete="current-password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-red-300 bg-white px-4 text-left outline-none focus:border-red-500"
                dir="ltr"
              />
            </label>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {pending ? t("disabling") : t("confirmDisable")}
              </button>
              <button
                type="button"
                onClick={() => { setShowDisable(false); setError(""); setDisablePassword(""); }}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700"
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // --- Scan / confirm QR code step ---
  if (step === "scan") {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border bg-white p-6">
          <p className="mb-3 text-sm leading-6 text-slate-600">{t("scanInstructions")}</p>

          {/* QR code rendered via qrcode.react */}
          {uri ? (
            <div className="mb-6 flex justify-center">
              <div className="rounded-2xl border-2 border-slate-100 bg-white p-4 shadow-sm">
                <QRCodeSVG value={uri} size={180} />
              </div>
            </div>
          ) : null}

          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t("manualSecret")}</p>
          <code className="block break-all rounded-xl bg-slate-100 p-4 text-sm font-bold tracking-widest" dir="ltr">
            {secret}
          </code>

          <form onSubmit={confirmSetup} className="mt-5 space-y-4">
            <label className="block text-sm font-bold text-slate-700">
              {t("enterCode")}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                placeholder="000000"
                className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-center text-xl font-black tracking-[0.4em] outline-none focus:border-primary"
                dir="ltr"
              />
            </label>
            {error ? (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <FiXCircle className="shrink-0" />
                {error}
              </div>
            ) : null}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={pending || code.length !== 6}
                className="rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-60"
              >
                {pending ? t("activating") : t("activate")}
              </button>
              <button
                type="button"
                onClick={() => { setStep("idle"); setCode(""); setSecret(""); setUri(""); setError(""); }}
                className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700"
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- Auth step ---
  if (step === "auth") {
    return (
      <div className="space-y-5">
        <form onSubmit={startSetup} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FiKey className="text-primary text-xl" />
            <h3 className="text-lg font-bold text-slate-800">
              {hasPassword ? t("wizard.authTitleCurrent") : t("wizard.authTitleNew")}
            </h3>
          </div>
          
          <p className="text-sm text-slate-600 mb-6">
            {hasPassword ? t("wizard.authDescCurrent") : t("wizard.authDescNew")}
          </p>

          {hasPassword ? (
            <label className="block text-sm font-bold text-slate-700">
              {t("passwordLabel")}
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-left outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                dir="ltr"
              />
            </label>
          ) : (
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700">
                {t("wizard.newPasswordLabel")}
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-left outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  dir="ltr"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                {t("wizard.confirmPasswordLabel")}
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-left outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  dir="ltr"
                />
              </label>
            </div>
          )}

          {error ? (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <FiXCircle className="shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-primary px-6 py-3 font-bold text-white disabled:opacity-60 transition-colors"
            >
              {pending ? t("starting") : t("wizard.continueBtn")}
            </button>
            <button
              type="button"
              onClick={() => { setStep("idle"); setError(""); setPassword(""); setNewPassword(""); setConfirmPassword(""); }}
              className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- Idle: show setup prompt ---
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <FiShield className="mt-0.5 shrink-0 text-xl text-amber-600" />
        <div>
          <p className="font-bold text-amber-800">{t("disabledTitle")}</p>
          <p className="mt-1 text-sm text-amber-700">{t("disabledDescription")}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setStep("auth")}
        className="rounded-xl bg-primary px-6 py-3 font-bold text-white transition hover:opacity-90"
      >
        {t("startSetup")}
      </button>
    </div>
  );
}
