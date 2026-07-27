"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FiChevronDown, FiChevronUp, FiClock, FiFileText, FiMessageCircle, FiPaperclip, FiSend, FiXCircle } from "react-icons/fi";
import { Link } from "@/i18n/navigation";

type ClaimNote = {
  id: string;
  content: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  isAdminNote: boolean;
  createdAt: string;
  author: { name: string | null; role: string };
};

type ClaimData = {
  id: string;
  status: string;
  createdAt: string;
  officialBusinessEmail: string | null;
  claimantName: string;
  verifiedAt: string | null;
  reviewedAt: string | null;
  decisionReason: string | null;
  business: { businessName: string; slug: string };
  notes: ClaimNote[];
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_VERIFICATION: { label: "pendingVerification", color: "text-sky-700", bg: "bg-sky-100" },
  UNDER_REVIEW: { label: "underReview", color: "text-amber-700", bg: "bg-amber-100" },
  APPROVED: { label: "approved", color: "text-emerald-700", bg: "bg-emerald-100" },
  REJECTED: { label: "rejected", color: "text-rose-700", bg: "bg-rose-100" },
  CANCELLED: { label: "cancelled", color: "text-slate-600", bg: "bg-slate-100" },
  EXPIRED: { label: "expired", color: "text-slate-600", bg: "bg-slate-100" },
};

export function ClaimDetailCard({ claim }: { claim: ClaimData }) {
  const t = useTranslations("Dashboard.claims");
  const router = useRouter();
  const [expanded, setExpanded] = useState(claim.status === "UNDER_REVIEW");
  const [notes, setNotes] = useState<ClaimNote[]>(claim.notes);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cfg = statusConfig[claim.status] || statusConfig.EXPIRED;
  const canInteract = ["UNDER_REVIEW", "PENDING_VERIFICATION"].includes(claim.status);
  const dateStr = new Date(claim.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  async function sendNote() {
    if (!message.trim() || sending) return;
    setSending(true);
    const form = new FormData();
    form.append("content", message.trim());
    const file = fileRef.current?.files?.[0];
    if (file) form.append("attachment", file);

    const res = await fetch(`/api/claims/${claim.id}/notes`, { method: "POST", body: form });
    const result = await res.json().catch(() => null);
    setSending(false);
    if (res.ok && result?.data) {
      setNotes((prev) => [...prev, result.data]);
      setMessage("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function cancelClaim() {
    if (cancelling) return;
    setCancelling(true);
    const res = await fetch(`/api/claims/${claim.id}/cancel`, { method: "POST" });
    setCancelling(false);
    if (res.ok) {
      setConfirmCancel(false);
      router.refresh();
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-start transition hover:bg-slate-50"
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg text-primary">
          <FiFileText />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-slate-950">{claim.business.businessName}</p>
          <p className="mt-0.5 text-xs text-slate-500">{dateStr} · {claim.officialBusinessEmail || "-"}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${cfg.bg} ${cfg.color}`}>
          {t(`statuses.${cfg.label}`)}
        </span>
        {expanded ? <FiChevronUp className="shrink-0 text-slate-400" /> : <FiChevronDown className="shrink-0 text-slate-400" />}
      </button>

      {/* Expanded content */}
      {expanded ? (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          {/* Details */}
          <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div><span className="font-bold text-slate-600">{t("fields.claimant")}:</span> <span className="text-slate-900">{claim.claimantName}</span></div>
            <div><span className="font-bold text-slate-600">{t("fields.email")}:</span> <span className="text-slate-900 ltr">{claim.officialBusinessEmail || "-"}</span></div>
            <div><span className="font-bold text-slate-600">{t("fields.verified")}:</span> <span className="text-slate-900">{claim.verifiedAt ? "✓" : "—"}</span></div>
            <div><span className="font-bold text-slate-600">{t("fields.status")}:</span> <span className={`font-bold ${cfg.color}`}>{t(`statuses.${cfg.label}`)}</span></div>
            {claim.decisionReason ? <div className="sm:col-span-2"><span className="font-bold text-slate-600">{t("fields.reason")}:</span> <span className="text-slate-900">{claim.decisionReason}</span></div> : null}
          </div>

          {/* Notes / Messages */}
          <div className="mt-4">
            <h4 className="flex items-center gap-2 text-sm font-black text-slate-800">
              <FiMessageCircle className="text-primary" /> {t("notes.title")} ({notes.length})
            </h4>

            {notes.length > 0 ? (
              <div className="mt-3 max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
                {notes.map((note) => (
                  <div key={note.id} className={`rounded-xl p-3 ${note.isAdminNote ? "border border-sky-200 bg-sky-50" : "bg-white shadow-sm"}`}>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-bold ${note.isAdminNote ? "text-sky-700" : "text-slate-700"}`}>
                        {note.isAdminNote ? t("notes.admin") : (note.author.name || t("notes.you"))}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-400">{new Date(note.createdAt).toLocaleString("de-DE")}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-slate-800">{note.content}</p>
                    {note.attachmentUrl ? (
                      <a href={note.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/10">
                        <FiPaperclip className="text-sm" /> {note.attachmentName || t("notes.attachment")}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">{t("notes.empty")}</p>
            )}

            {/* Send message form */}
            {canInteract ? (
              <div className="mt-3">
                <div className="flex gap-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("notes.placeholder")}
                    rows={2}
                    maxLength={2000}
                    className="min-h-[72px] w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                    <FiPaperclip />
                    {t("notes.attachFile")}
                    <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={sendNote}
                    disabled={!message.trim() || sending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiSend /> {sending ? t("notes.sending") : t("notes.send")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Cancel */}
          {canInteract ? (
            <div className="mt-5 border-t border-slate-100 pt-4">
              {!confirmCancel ? (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                >
                  <FiXCircle /> {t("cancel.button")}
                </button>
              ) : (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-bold text-rose-800">{t("cancel.confirm")}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={cancelClaim} disabled={cancelling} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50">
                      {cancelling ? t("cancel.cancelling") : t("cancel.yes")}
                    </button>
                    <button type="button" onClick={() => setConfirmCancel(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                      {t("cancel.no")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Link to business */}
          <div className="mt-4 text-end">
            <Link href={`/businesses/${claim.business.slug}`} className="text-xs font-bold text-primary transition hover:text-primary-dark">
              {t("viewBusiness")} →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
