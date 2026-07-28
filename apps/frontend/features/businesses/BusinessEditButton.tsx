"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { FiAlertCircle, FiBriefcase, FiCheck, FiEdit3, FiUser, FiUsers, FiX } from "react-icons/fi";
import { isAppLocale, localizePathname } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import type { BusinessDetailData, CurrentUser } from "@/lib/api";

type Relation = "OWNER" | "EMPLOYEE" | "CUSTOMER";
type Props = { business: BusinessDetailData; currentUser: CurrentUser | null };

const editableFields = [
  "businessName", "legalName", "shortDescription", "description", "email", "phone", "mobile", "whatsapp", "website",
  "instagram", "telegram", "facebook", "youtube", "linkedin", "address", "postalCode", "categoryId", "subCategoryId",
  "specialtyId", "cityId", "districtId", "establishedYear", "priceRange",
] as const;

export function BusinessEditButton({ business, currentUser }: Props) {
  const t = useTranslations("BusinessDetail.editBusiness");
  const locale = useLocale();
  const activeLocale = isAppLocale(locale) ? locale : "de";
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [relation, setRelation] = useState<Relation | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [resendCooldown, setResendCooldown] = useState(0);
  const [claimResult, setClaimResult] = useState<"APPROVED" | "UNDER_REVIEW" | null>(null);

  const [selectedField, setSelectedField] = useState<typeof editableFields[number]>("businessName");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("edit") === "1") {
        setOpen(true);
      } else if (searchParams.get("claim") === "1") {
        setOpen(true);
        setRelation("OWNER");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [resendCooldown]);

  const [useExistingEmail, setUseExistingEmail] = useState(Boolean(business.email));

  function close() {
    setOpen(false);
    setRelation(null);
    setClaimId(null);
    setSelectedField("businessName");
    setFeedback("");
    setResendCooldown(0);
    setClaimResult(null);
    setUseExistingEmail(Boolean(business.email));
  }



  async function submitClaim(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) return;
    setPending(true); setFeedback("");
    const form = new FormData(event.currentTarget);
    const termsAndPrivacyAccepted = form.get("termsAndPrivacyAccepted") === "on";
    const response = await fetch("/api/business-claims", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: business.id,
        claimantName: form.get("claimantName"),
        officialBusinessEmail: useExistingEmail ? undefined : form.get("officialBusinessEmail"),
        useExistingEmail,
        officialUrl: normalizeOptionalUrl(form.get("officialUrl")),
        termsAccepted: termsAndPrivacyAccepted,
        privacyNoticeAccepted: termsAndPrivacyAccepted,
      }),
    });
    const result = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) { setFeedback(result?.code === "ALREADY_OWNER" ? t("ownerUnavailable") : result?.error || t("errors.submit")); return; }
    setClaimId(result.data.id); setFeedback(t("claim.codeSent")); setResendCooldown(60);
  }

  async function verifyClaim(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!claimId) return;
    setPending(true); setFeedback("");
    const code = new FormData(event.currentTarget).get("code");
    const response = await fetch(`/api/business-claims/${claimId}/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const result = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) { setFeedback(result?.error || t("errors.verify")); return; }
    setClaimResult(result.data.status === "APPROVED" ? "APPROVED" : "UNDER_REVIEW");
  }

  async function resendClaim() {
    if (!claimId || pending || resendCooldown > 0) return;
    setPending(true); setFeedback("");
    const response = await fetch(`/api/business-claims/${claimId}/resend`, { method: "POST" });
    const result = await response.json().catch(() => null);
    setPending(false);
    if (response.ok) {
      setFeedback(t("claim.codeSent"));
      setResendCooldown(60);
    } else {
      setFeedback(result?.error || t("errors.submit"));
      if (result?.code === "OTP_BLOCKED") setResendCooldown(60);
    }
  }

  async function submitSuggestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!relation || relation === "OWNER") return;
    setPending(true); setFeedback("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/business-change-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: business.id, submitterRelation: relation, kind: "DETAILS",
        payload: { changes: [{ field: form.get("field"), value: form.get("value") }] },
        additionalContext: String(form.get("additionalContext") || "") || undefined,
      }),
    });
    const result = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) {
      if (result?.code === "CHANGE_REQUEST_ALREADY_ACTIVE") {
        setFeedback(t("errors.alreadyActive"));
      } else if (result?.code === "RATE_LIMITED") {
        setFeedback(t("errors.rateLimited"));
      } else if (result?.code === "AUTH_REQUIRED") {
        setFeedback(t("authRequired"));
      } else if (typeof result?.error === "string" && result.error.toLowerCase().includes("email")) {
        setFeedback(t("errors.invalidEmail"));
      } else if (typeof result?.error === "string" && result.error.toLowerCase().includes("phone")) {
        setFeedback(t("errors.invalidPhone"));
      } else if (typeof result?.error === "string" && (result.error.toLowerCase().includes("url") || result.error.toLowerCase().includes("http"))) {
        setFeedback(t("errors.invalidUrl"));
      } else if (typeof result?.error === "string" && result.error.toLowerCase().includes("postal")) {
        setFeedback(t("errors.invalidPostalCode"));
      } else {
        setFeedback(t("errors.submit"));
      }
      return;
    }
    setFeedback(t("suggestion.submitted"));
    event.currentTarget.reset();
  }

  const loginHref = localizePathname(`/login?callbackUrl=${encodeURIComponent(`/businesses/${business.slug}?edit=1`)}`, activeLocale);
  const claimPrivacyHref = localizePathname("/privacy/business-claims", activeLocale);

  return <>
    <div className="mt-8 border-t border-slate-100 pt-6">
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-5 text-sm font-black text-primary transition hover:border-primary/30 hover:bg-primary/10">
        <FiEdit3 /> {t("button")}
      </button>
    </div>
    {mounted && open ? createPortal(
      <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("title")}>
        <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black">{t("title")}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{business.title}</p></div><button type="button" onClick={close} className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-slate-100 transition hover:bg-slate-200" aria-label={t("close")}><FiX /></button></div>

          {!relation ? <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <RoleButton icon={FiBriefcase} label={t("roles.owner")} onClick={() => setRelation("OWNER")} />
            <RoleButton icon={FiUsers} label={t("roles.employee")} onClick={() => setRelation("EMPLOYEE")} />
            <RoleButton icon={FiUser} label={t("roles.customer")} onClick={() => setRelation("CUSTOMER")} />
          </div> : null}

          {relation === "OWNER" && business.hasOwner && currentUser ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-lg text-amber-700"><FiAlertCircle /></span>
                <div>
                  <h3 className="text-sm font-black text-amber-900">{t("ownedGuidance.title")}</h3>
                  <p className="mt-1 text-xs leading-5 text-amber-800">{t("ownedGuidance.description")}</p>
                </div>
              </div>
            </div>
          ) : null}

          {relation && !currentUser ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><p>{t("authRequired")}</p><a href={loginHref} className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 font-black text-white">{t("signIn")}</a></div> : null}

          {relation === "OWNER" && currentUser && !claimId ? <form onSubmit={submitClaim} className="mt-6 grid gap-4">
            <Field label={t("claim.fullName")}><input name="claimantName" required minLength={2} defaultValue={currentUser.name} className={inputClass} /></Field>
            <Field label={t("claim.accountEmail")}><input value={currentUser.email || ""} readOnly className={`${inputClass} bg-slate-100 text-left`} dir="ltr" /></Field>
            {business.email ? (
              <div className="grid gap-3">
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm leading-6">
                  <input type="radio" name="emailOption" checked={useExistingEmail} onChange={() => setUseExistingEmail(true)} className="mt-1 shrink-0" />
                  <span>{t("claim.useExistingEmail")} <b dir="ltr">{obfuscateEmail(business.email)}</b></span>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm leading-6">
                  <input type="radio" name="emailOption" checked={!useExistingEmail} onChange={() => setUseExistingEmail(false)} className="mt-1 shrink-0" />
                  <span>{t("claim.useNewEmail")}</span>
                </label>
                {!useExistingEmail && (
                  <Field label={t("claim.businessEmail")}><input name="officialBusinessEmail" type="email" required={!useExistingEmail} className={`${inputClass} text-left`} dir="ltr" /></Field>
                )}
              </div>
            ) : (
              <Field label={t("claim.businessEmail")}><input name="officialBusinessEmail" type="email" required className={`${inputClass} text-left`} dir="ltr" /></Field>
            )}
            <Field label={t("claim.officialUrl")}><input name="officialUrl" type="text" inputMode="url" defaultValue={business.website || ""} placeholder="example.com" className={`${inputClass} text-left`} dir="ltr" /></Field>
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm leading-6"><input name="termsAndPrivacyAccepted" type="checkbox" required className="mt-1 shrink-0" /><span>{t.rich("claim.agreement", {
              terms: (chunks) => <a href={`${claimPrivacyHref}#business-terms`} target="_blank" rel="noreferrer" className="font-black text-primary underline decoration-primary/30 underline-offset-4">{chunks}</a>,
              privacy: (chunks) => <a href={`${claimPrivacyHref}#privacy-notice`} target="_blank" rel="noreferrer" className="font-black text-primary underline decoration-primary/30 underline-offset-4">{chunks}</a>,
            })}</span></label>
            <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">{t("claim.process")}</p>
            <button disabled={pending} className={primaryButton}>{pending ? t("submitting") : t("claim.sendCode")}</button>
          </form> : null}

          {relation === "OWNER" && currentUser && claimId ? <form onSubmit={verifyClaim} className="mt-6 grid gap-4">
            <Field label={t("claim.code")}><input name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className={`${inputClass} text-center text-2xl tracking-[.4em]`} dir="ltr" /></Field>
            <button disabled={pending} className={primaryButton}>{pending ? t("submitting") : t("claim.verify")}</button>
            <button type="button" disabled={pending || resendCooldown > 0} onClick={resendClaim} className="cursor-pointer text-sm font-black text-primary transition hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-60">
              {resendCooldown > 0 ? `${t("claim.resend")} (${resendCooldown}s)` : t("claim.resend")}
            </button>
          </form> : null}

          {relation && relation !== "OWNER" && currentUser ? <form onSubmit={submitSuggestion} className="mt-6 grid gap-4">
            <Field label={t("suggestion.field")}>
              <select name="field" value={selectedField} onChange={(e) => setSelectedField(e.target.value as any)} className={inputClass}>
                {editableFields.map((field) => <option key={field} value={field}>{t(`fields.${field}`)}</option>)}
              </select>
            </Field>

            <Field label={t("suggestion.value")}>
              {["phone", "mobile", "whatsapp"].includes(selectedField) ? (
                <input name="value" type="tel" required pattern="[+0-9\s\-()]{3,30}" placeholder="+49 30 1234567" className={`${inputClass} text-left`} dir="ltr" />
              ) : selectedField === "email" ? (
                <input name="value" type="email" required placeholder="example@domain.com" className={`${inputClass} text-left`} dir="ltr" />
              ) : ["website", "instagram", "telegram", "facebook", "youtube", "linkedin"].includes(selectedField) ? (
                <input name="value" type="text" inputMode="url" required placeholder="https://..." className={`${inputClass} text-left`} dir="ltr" />
              ) : selectedField === "postalCode" ? (
                <input name="value" type="text" required pattern="[a-zA-Z0-9\s\-]{3,15}" placeholder="12345" className={`${inputClass} text-left`} dir="ltr" />
              ) : selectedField === "establishedYear" ? (
                <input name="value" type="number" required min={1800} max={2100} placeholder="2020" className={`${inputClass} text-left`} dir="ltr" />
              ) : selectedField === "priceRange" ? (
                <select name="value" required className={inputClass}>
                  <option value="BUDGET">{t("priceRanges.BUDGET")}</option>
                  <option value="MODERATE">{t("priceRanges.MODERATE")}</option>
                  <option value="EXPENSIVE">{t("priceRanges.EXPENSIVE")}</option>
                  <option value="LUXURY">{t("priceRanges.LUXURY")}</option>
                </select>
              ) : (
                <textarea name="value" required rows={selectedField === "description" ? 5 : 3} className={inputClass} placeholder={t("suggestion.valuePlaceholder")} />
              )}
            </Field>

            <Field label={t("suggestion.context")}><textarea name="additionalContext" rows={3} className={inputClass} placeholder={t("suggestion.contextPlaceholder")} /></Field>
            <button disabled={pending} className={primaryButton}>{pending ? t("submitting") : t("suggestion.submit")}</button>
          </form> : null}

          {feedback && !claimResult ? <p role="status" className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">{feedback}</p> : null}

          {claimResult ? (
            <div className="mt-6 flex flex-col items-center py-4 text-center">
              <div className={`grid h-20 w-20 place-items-center rounded-full ${claimResult === "APPROVED" ? "bg-emerald-100" : "bg-amber-100"}`}>
                <svg className="claim-success-check h-10 w-10" viewBox="0 0 24 24" fill="none" stroke={claimResult === "APPROVED" ? "#059669" : "#d97706"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" className="claim-check-path" />
                </svg>
              </div>
              <h3 className="mt-5 text-xl font-black text-slate-950">
                {claimResult === "APPROVED" ? t("claim.approved") : t("claimSuccess.title")}
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-7 text-slate-600">
                {claimResult === "APPROVED" ? t("claimSuccess.approvedDescription") : t("claimSuccess.reviewDescription")}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/business-portal" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-white transition hover:bg-primary-dark">
                  {t("claimSuccess.viewDashboard")}
                </Link>
                <button type="button" onClick={close} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  {t("close")}
                </button>
              </div>
              <style>{`
                .claim-check-path {
                  stroke-dasharray: 30;
                  stroke-dashoffset: 30;
                  animation: claim-draw-check 0.5s ease-out 0.2s forwards;
                }
                @keyframes claim-draw-check {
                  to { stroke-dashoffset: 0; }
                }
                .claim-success-check {
                  animation: claim-scale-in 0.3s ease-out;
                }
                @keyframes claim-scale-in {
                  from { transform: scale(0.5); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
                }
              `}</style>
            </div>
          ) : null}
        </div>
      </div>, document.body) : null}
  </>;
}

const inputClass = "min-h-12 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary";
const primaryButton = "min-h-12 cursor-pointer rounded-2xl border border-primary/25 bg-primary/10 px-5 font-black text-primary-dark shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/15 hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}{children}</label>; }
function RoleButton({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="grid min-h-32 cursor-pointer place-items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 font-black transition hover:border-primary hover:bg-primary/5"><Icon className="text-2xl text-primary" />{label}</button>; }

function normalizeOptionalUrl(value: FormDataEntryValue | null) {
  const url = typeof value === "string" ? value.trim() : "";
  if (!url) return undefined;
  return /^https:\/\//i.test(url) ? url : `https://${url}`;
}

function obfuscateEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return `${name[0]}***@${domain}`;
}
