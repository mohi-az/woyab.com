"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { FiAlertTriangle, FiX } from "react-icons/fi";
import type { CurrentUser } from "@/lib/api";

type ReportReason =
  | "SPAM"
  | "FAKE_OR_MANIPULATED"
  | "WRONG_BUSINESS"
  | "ILLEGAL_CONTENT"
  | "PERSONAL_DATA"
  | "HATE_OR_HARASSMENT"
  | "COPYRIGHT"
  | "OTHER";

type Props = {
  targetType: "business" | "review";
  targetId: string;
  targetLabel: string;
  currentUser: CurrentUser | null;
  variant?: "hero" | "review";
};

const reasons: ReportReason[] = [
  "SPAM",
  "FAKE_OR_MANIPULATED",
  "WRONG_BUSINESS",
  "ILLEGAL_CONTENT",
  "PERSONAL_DATA",
  "HATE_OR_HARASSMENT",
  "COPYRIGHT",
  "OTHER",
];

const errorKeyByCode: Record<string, string> = {
  INVALID_FIELDS: "invalidFields",
  RATE_LIMITED: "rateLimited",
  EMAIL_REQUIRED: "emailRequired",
  TARGET_NOT_FOUND: "targetNotFound",
  DUPLICATE_OPEN_REPORT: "duplicateOpenReport",
};

export function DirectoryReportButton({ targetType, targetId, targetLabel, currentUser, variant = "review" }: Props) {
  const t = useTranslations("BusinessDetail.report");
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<ReportReason>("FAKE_OR_MANIPULATED");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  const isHero = variant === "hero";
  const buttonLabel = submitted ? t("submittedButton") : targetType === "business" ? t("buttonBusiness") : t("buttonReview");

  function close() {
    if (pending) return;
    setOpen(false);
    setFeedback(null);
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setFeedback(null);

    if (!currentUser && !reporterEmail.trim()) {
      setFeedback(t("emailRequired"));
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/directory-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: targetType === "business" ? targetId : undefined,
          reviewId: targetType === "review" ? targetId : undefined,
          reasonCode,
          reason: reason.trim() || undefined,
          message: message.trim() || undefined,
          reporterName: reporterName.trim() || undefined,
          reporterEmail: reporterEmail.trim() || currentUser?.email || undefined,
          targetUrl: typeof window === "undefined" ? undefined : window.location.href,
        }),
      });
      const json = await response.json().catch(() => null) as { error?: string; errorCode?: string; data?: { id?: string } } | null;

      if (!response.ok) {
        const errorKey = json?.errorCode ? errorKeyByCode[json.errorCode] : null;
        setFeedback(errorKey ? t(`errors.${errorKey}`) : t("submitError"));
        return;
      }

      setReason("");
      setMessage("");
      setReporterName("");
      setReporterEmail("");
      setSubmitted(true);
      setFeedback(t("submitSuccess"));
      setOpen(false);
    } catch {
      setFeedback(t("submitError"));
    } finally {
      setPending(false);
    }
  }

  const modal = open ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-950">{t("modalTitle")}</h2>
            <p className="mt-1 truncate text-sm text-slate-500">{targetLabel}</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            aria-label={t("close")}
          >
            <FiX />
          </button>
        </div>

        <form className="space-y-4 px-5 py-5" onSubmit={submitReport}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">{t("reasonLabel")}</span>
            <select
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value as ReportReason)}
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-primary"
            >
              {reasons.map((item) => (
                <option key={item} value={item}>{t(`reasons.${item}`)}</option>
              ))}
            </select>
          </label>

          {reasonCode === "OTHER" ? (
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("otherPlaceholder")}
              className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-primary"
            />
          ) : null}

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t("messagePlaceholder")}
            rows={5}
            className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary"
          />

          {!currentUser ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={reporterName}
                onChange={(event) => setReporterName(event.target.value)}
                placeholder={t("namePlaceholder")}
                className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-primary"
              />
              <input
                type="email"
                value={reporterEmail}
                onChange={(event) => setReporterEmail(event.target.value)}
                placeholder={t("emailPlaceholder")}
                className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-primary"
              />
            </div>
          ) : null}

          {feedback ? <p className="text-sm font-medium text-slate-600">{feedback}</p> : null}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={close}
              className="min-h-11 cursor-pointer rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black !text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 [&_*]:!text-white"
            >
              <FiAlertTriangle />
              {pending ? t("submitting") : t("submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <span className="group relative inline-flex">
        <button
          type="button"
          onClick={() => {
            if (!submitted) setOpen(true);
          }}
          disabled={submitted}
          aria-label={buttonLabel}
          className={isHero
            ? "inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:border-white/25 hover:bg-white/15 disabled:cursor-default disabled:opacity-75"
            : "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-default disabled:border-emerald-100 disabled:text-emerald-700"}
        >
          <FiAlertTriangle />
          <span className="sr-only">{buttonLabel}</span>
        </button>
        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-lg group-hover:block group-focus-within:block">
          {buttonLabel}
        </span>
      </span>
      {feedback && !open ? (
        <span className={isHero ? "text-sm font-bold text-emerald-200" : "text-xs font-bold text-emerald-700"}>
          {feedback}
        </span>
      ) : null}

      {modal && typeof document !== "undefined" ? createPortal(modal, document.body) : null}
    </>
  );
}
