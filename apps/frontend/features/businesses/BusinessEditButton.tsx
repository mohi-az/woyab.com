"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { FiAlertCircle, FiBriefcase, FiEdit3, FiUser, FiUsers, FiX } from "react-icons/fi";
import { isAppLocale, localizePathname } from "@/i18n/config";
import type { BusinessDetailData, CurrentUser } from "@/lib/api";

type Relation = "OWNER" | "EMPLOYEE" | "CUSTOMER";
type Props = { business: BusinessDetailData; currentUser: CurrentUser | null };

const editableFields = [
  "businessName", "legalName", "shortDescription", "description", "email", "phone", "mobile", "whatsapp", "website",
  "instagram", "telegram", "facebook", "youtube", "linkedin", "address", "postalCode", "categoryId", "subCategoryId",
  "specialtyId", "cityId", "districtId", "latitude", "longitude", "establishedYear", "priceRange",
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
      if (new URLSearchParams(window.location.search).get("edit") === "1") setOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function close() {
    setOpen(false);
    setRelation(null);
    setClaimId(null);
    setFeedback("");
  }

  function openOwnershipReport() {
    close();
    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>("#business-report-trigger button")?.click();
    }, 0);
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
        officialBusinessEmail: form.get("officialBusinessEmail"),
        officialUrl: normalizeOptionalUrl(form.get("officialUrl")),
        termsAccepted: termsAndPrivacyAccepted,
        privacyNoticeAccepted: termsAndPrivacyAccepted,
      }),
    });
    const result = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) { setFeedback(result?.code === "BUSINESS_ALREADY_OWNED" ? t("ownerUnavailable") : result?.error || t("errors.submit")); return; }
    setClaimId(result.data.id); setFeedback(t("claim.codeSent"));
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
    setFeedback(result.data.status === "APPROVED" ? t("claim.approved") : t("claim.review"));
    if (result.data.status === "APPROVED") setClaimId(null);
  }

  async function resendClaim() {
    if (!claimId || pending) return;
    setPending(true); setFeedback("");
    const response = await fetch(`/api/business-claims/${claimId}/resend`, { method: "POST" });
    const result = await response.json().catch(() => null);
    setPending(false); setFeedback(response.ok ? t("claim.codeSent") : result?.error || t("errors.submit"));
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
        evidenceUrl: normalizeOptionalUrl(form.get("evidenceUrl")),
      }),
    });
    const result = await response.json().catch(() => null);
    setPending(false);
    setFeedback(response.ok ? t("suggestion.submitted") : result?.error || t("errors.submit"));
    if (response.ok) event.currentTarget.reset();
  }

  const loginHref = localizePathname(`/login?callbackUrl=${encodeURIComponent(`/businesses/${business.slug}?edit=1`)}`, activeLocale);
  const claimPrivacyHref = localizePathname("/privacy/business-claims", activeLocale);

  return <>
    <button type="button" onClick={() => setOpen(true)} className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-5 text-sm font-black text-primary transition hover:border-primary/30 hover:bg-primary/10">
      <FiEdit3 /> {t("button")}
    </button>
    {mounted && open ? createPortal(
      <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("title")}>
        <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black">{t("title")}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{business.title}</p></div><button type="button" onClick={close} className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-slate-100 transition hover:bg-slate-200" aria-label={t("close")}><FiX /></button></div>

          {business.hasOwner && !relation ? (
            <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-xl text-amber-800"><FiAlertCircle /></span>
                <div>
                  <h3 className="text-lg font-black">{t("ownedGuidance.title")}</h3>
                  <p className="mt-2 text-sm leading-7 text-amber-900">{t("ownedGuidance.description")}</p>
                </div>
              </div>
              <button type="button" onClick={openOwnershipReport} className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-amber-900 px-5 text-sm font-black text-white transition hover:bg-amber-950">
                {t("ownedGuidance.action")}
              </button>
            </div>
          ) : null}

          {!relation ? <div className={`mt-6 grid gap-3 ${business.hasOwner ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {!business.hasOwner ? <RoleButton icon={FiBriefcase} label={t("roles.owner")} onClick={() => setRelation("OWNER")} /> : null}
            <RoleButton icon={FiUsers} label={t("roles.employee")} onClick={() => setRelation("EMPLOYEE")} />
            <RoleButton icon={FiUser} label={t("roles.customer")} onClick={() => setRelation("CUSTOMER")} />
          </div> : null}

          {relation && !currentUser ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><p>{t("authRequired")}</p><a href={loginHref} className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 font-black text-white">{t("signIn")}</a></div> : null}

          {relation === "OWNER" && currentUser && !claimId ? <form onSubmit={submitClaim} className="mt-6 grid gap-4">
            <Field label={t("claim.fullName")}><input name="claimantName" required minLength={2} defaultValue={currentUser.name} className={inputClass} /></Field>
            <Field label={t("claim.accountEmail")}><input value={currentUser.email || ""} readOnly className={`${inputClass} bg-slate-100 text-left`} dir="ltr" /></Field>
            <Field label={t("claim.businessEmail")}><input name="officialBusinessEmail" type="email" required defaultValue={business.email || ""} className={`${inputClass} text-left`} dir="ltr" /></Field>
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
            <button type="button" disabled={pending} onClick={resendClaim} className="cursor-pointer text-sm font-black text-primary transition hover:text-primary-dark disabled:cursor-not-allowed">{t("claim.resend")}</button>
          </form> : null}

          {relation && relation !== "OWNER" && currentUser ? <form onSubmit={submitSuggestion} className="mt-6 grid gap-4">
            <Field label={t("suggestion.field")}><select name="field" className={inputClass}>{editableFields.map((field) => <option key={field} value={field}>{t(`fields.${field}`)}</option>)}</select></Field>
            <Field label={t("suggestion.value")}><textarea name="value" required rows={4} className={inputClass} /></Field>
            <Field label={t("suggestion.context")}><textarea name="additionalContext" rows={3} className={inputClass} /></Field>
            <Field label={t("suggestion.evidence")}><input name="evidenceUrl" type="text" inputMode="url" placeholder="example.com" className={`${inputClass} text-left`} dir="ltr" /></Field>
            <button disabled={pending} className={primaryButton}>{pending ? t("submitting") : t("suggestion.submit")}</button>
          </form> : null}

          {feedback ? <p role="status" className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">{feedback}</p> : null}
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
