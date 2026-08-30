"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const subjects = ["GENERAL", "ACCOUNT", "BUSINESS_OWNERSHIP", "PARTNERSHIP", "PRIVACY", "OTHER"] as const;

export function ContactForm() {
  const t = useTranslations("Contact");
  const locale = useLocale();
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setStatus("sending");
    setError("");

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-woyab-locale": locale },
      body: JSON.stringify({
        name: values.get("name"),
        email: values.get("email"),
        phone: values.get("phone"),
        subject: values.get("subject"),
        message: values.get("message"),
        privacyAcknowledged: values.get("privacyAcknowledged") === "on",
        website: values.get("website"),
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.code === "RATE_LIMITED" ? t("errors.rateLimited") : t("errors.submit"));
      setStatus("error");
      return;
    }

    form.reset();
    setStatus("success");
  }

  const inputClass = "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10";

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          {t("fields.name")}
          <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={inputClass} placeholder={t("placeholders.name")} />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          {t("fields.email")}
          <input name="email" type="email" required maxLength={254} autoComplete="email" dir="ltr" className={inputClass} placeholder={t("placeholders.email")} />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          {t("fields.phone")}
          <input name="phone" type="tel" maxLength={40} autoComplete="tel" dir="ltr" className={inputClass} placeholder={t("placeholders.phone")} />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          {t("fields.subject")}
          <select name="subject" defaultValue="GENERAL" className={inputClass}>
            {subjects.map((subject) => <option key={subject} value={subject}>{t(`subjects.${subject}`)}</option>)}
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-800">
        {t("fields.message")}
        <textarea name="message" required minLength={10} maxLength={4000} rows={7} className={`${inputClass} min-h-40 py-3`} placeholder={t("placeholders.message")} />
      </label>
      <div className="sr-only" aria-hidden="true">
        <label>{t("website")}<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
        <input name="privacyAcknowledged" type="checkbox" required className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 text-primary focus:ring-primary" />
        <span>{t.rich("privacyAcknowledgement", { privacy: (chunks) => <Link href="/privacy" className="font-bold text-primary underline underline-offset-2">{chunks}</Link> })}</span>
      </label>
      {status === "success" ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">{t("success")}</p> : null}
      {status === "error" ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800" role="alert">{error}</p> : null}
      <button disabled={status === "sending"} className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-primary px-5 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
        {status === "sending" ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
