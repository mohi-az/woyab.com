"use client";

import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { isAppLocale, localizePathname } from "@/i18n/config";

export function SecurityForms({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations("Dashboard.security.form");
  const locale = useLocale();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [deleteMessage, setDeleteMessage] = useState("");
  const activeLocale = isAppLocale(locale) ? locale : "de";

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function requestPasswordLink() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json().catch(() => ({ error: "Server error" }));
      
      if (!response.ok) {
        setMessage(result.error || "خطا در ارسال ایمیل.");
      } else {
        setMessage(t("resetSent"));
        setCountdown(60);
      }
    } catch (e) {
      setMessage("خطا در برقراری ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm(t("confirmDelete"))) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) return setDeleteMessage(result.error ?? t("deleteFailed"));
    await signOut({ redirectTo: localizePathname("/", activeLocale) });
  }

  return <div className="space-y-6">
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black">{t("passwordTitle")}</h2>
      <p className="text-sm leading-6 text-slate-600">
        {hasPassword
          ? t("hasPasswordText")
          : t("googleText")}
      </p>
      {message ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p> : null}
      <button type="button" onClick={requestPasswordLink} disabled={loading || countdown > 0} className="rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-60">
        {loading 
          ? t("sending") 
          : countdown > 0 
            ? `ارسال مجدد (${countdown}s)` 
            : hasPassword ? t("sendChangeLink") : t("sendCreateLink")
        }
      </button>
    </section>
    <form onSubmit={deleteAccount} className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-black text-red-800">{t("deleteTitle")}</h2>
      <p className="text-sm text-red-700">{t("deleteText")}</p>
      <label className="block text-sm font-bold text-red-800">{t("deleteMode")}
        <select name="mode" className="mt-2 h-11 w-full rounded-xl border border-red-300 bg-white px-3">
          <option value="ERASE">{t("deleteModeErase")}</option>
          <option value="ANONYMIZE">{t("deleteModeAnonymize")}</option>
        </select>
      </label>
      {hasPassword ? <Password name="password" label={t("passwordConfirm")} /> : null}
      <label className="block text-sm font-bold text-red-800">{t("deleteConfirm")}<input required name="confirmation" pattern="DELETE" className="mt-2 h-11 w-full rounded-xl border border-red-300 px-3" /></label>
      {deleteMessage ? <p className="text-sm text-red-700">{deleteMessage}</p> : null}
      <button className="rounded-xl bg-red-700 px-5 py-3 font-bold text-white">{t("deleteButton")}</button>
    </form>
  </div>;
}

function Password({ name, label }: { name: string; label: string }) {
  return <label className="block text-sm font-bold">{label}<input required name={name} type="password" autoComplete="current-password" className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label>;
}
