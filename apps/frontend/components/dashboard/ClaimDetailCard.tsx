"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FiChevronDown, FiChevronUp, FiClock, FiFileText, FiMessageCircle, FiPaperclip, FiSend, FiXCircle, FiShield, FiUser, FiDownload } from "react-icons/fi";
import { Link } from "@/i18n/navigation";

type ClaimNote = {
  id: string;
  content: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachments?: { url: string; name: string }[] | null | any;
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
  PENDING_VERIFICATION: { label: "statuses.pendingVerification", color: "text-sky-700", bg: "bg-sky-100" },
  UNDER_REVIEW: { label: "statuses.underReview", color: "text-amber-700", bg: "bg-amber-100" },
  APPROVED: { label: "statuses.approved", color: "text-emerald-700", bg: "bg-emerald-100" },
  REJECTED: { label: "statuses.rejected", color: "text-rose-700", bg: "bg-rose-100" },
  CANCELLED: { label: "statuses.cancelled", color: "text-slate-600", bg: "bg-slate-100" },
  EXPIRED: { label: "statuses.expired", color: "text-slate-600", bg: "bg-slate-100" },
};

export function ClaimDetailCard({ claim }: { claim: ClaimData }) {
  const t = useTranslations("Dashboard.claims");
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState<ClaimNote[]>(claim.notes);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cfg = statusConfig[claim.status] || statusConfig.EXPIRED;
  const canInteract = ["UNDER_REVIEW", "PENDING_VERIFICATION"].includes(claim.status);
  const dateStr = new Date(claim.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  async function sendNote() {
    if (!message.trim() && selectedFiles.length === 0) return;
    if (sending) return;
    setErrorMsg("");
    setSending(true);
    
    try {
      const form = new FormData();
      form.append("content", message.trim() || "پیوست فایل");
      
      for (const file of selectedFiles) {
        form.append("attachment", file);
      }
      
      const res = await fetch(`/api/claims/${claim.id}/notes`, { method: "POST", body: form });
      const result = await res.json().catch(() => null);
      
      if (res.ok && result?.data) {
        setNotes((prev) => [...prev, result.data]);
        setMessage("");
        setSelectedFiles([]);
        if (fileRef.current) fileRef.current.value = "";
      } else {
        throw new Error(result?.error || "Failed to send message.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setSending(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length) setSelectedFiles((prev) => [...prev, ...files]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) setSelectedFiles((prev) => [...prev, ...files]);
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function cancelClaim() {
    setCancelling(true);
    const res = await fetch(`/api/claims/${claim.id}/cancel`, { method: "POST" });
    if (res.ok) {
      router.refresh();
    } else {
      setCancelling(false);
      setConfirmCancel(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4">
          <div className={`rounded-xl p-3 ${cfg.bg} ${cfg.color}`}>
            <FiFileText size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{claim.business.businessName}</h3>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}>
                {t(cfg.label)}
              </span>
              <span>•</span>
              <span className="text-xs text-slate-500 font-medium">تاریخ درخواست: {dateStr}</span>
            </div>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-600 p-2">
          {expanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
        </button>
      </div>

      {expanded ? (
        <div className="mt-6 border-t border-slate-100 pt-6">
          
          {/* Claim Details Summary */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3 rounded-2xl bg-slate-50/70 p-5 text-sm border border-slate-200/60 shadow-xs">
            <div>
              <span className="block text-xs font-medium text-slate-400 mb-1">{t("fields.claimant") || "نام متقاضی"}</span>
              <span className="font-semibold text-slate-700">{claim.claimantName}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400 mb-1">{t("fields.email") || "ایمیل رسمی"}</span>
              <span className="font-semibold text-slate-700">{claim.officialBusinessEmail}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-400 mb-1">{t("viewBusiness") || "مشاهده صفحه کسب‌وکار"}</span>
              <Link href={`/businesses/${claim.business.slug}`} className="font-semibold text-primary hover:underline flex items-center gap-1">
                {claim.business.slug} <FiChevronDown className="rotate-90 shrink-0" />
              </Link>
            </div>
            {claim.decisionReason && (
              <div className="sm:col-span-3 mt-2 border-t border-slate-200/60 pt-3">
                <span className="block text-xs font-medium text-slate-400 mb-1">{t("fields.reason") || "دلیل تصمیم‌گیری"}</span>
                <span className="font-semibold text-rose-600">{claim.decisionReason}</span>
              </div>
            )}
          </div>

          <h4 className="font-bold text-slate-800 mb-3">{t("notes.title") || "پیام‌ها و مکاتبات"}</h4>
          <div className="rounded-2xl bg-slate-50/70 p-4 border border-slate-200/60 space-y-4 max-h-[500px] overflow-y-auto">
            {notes.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {t("notes.empty") || "هنوز پیامی ثبت نشده است."}
              </div>
            ) : (
              notes.map((note) => {
                const isAdmin = note.isAdminNote;
                return (
                  <div key={note.id} className={`flex flex-col ${isAdmin ? "items-start" : "items-end"}`}>
                    {/* Header badge */}
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold mb-1.5 shadow-2xs ${
                      isAdmin ? "bg-indigo-100 text-indigo-800 border border-indigo-200/70" : "bg-slate-200/80 text-slate-700 border border-slate-300/50"
                    }`}>
                      {isAdmin ? (
                        <>
                          <FiShield className="text-indigo-600 text-xs" />
                          <span>پشتیبانی</span>
                        </>
                      ) : (
                        <>
                          <FiUser className="text-slate-500 text-xs" />
                          <span>{note.author?.name || claim.claimantName || "شما"}</span>
                        </>
                      )}
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                      isAdmin 
                        ? "bg-slate-900 text-slate-100 border border-slate-800 rounded-tr-xs" 
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{note.content}</p>

                      {/* Single attachment */}
                      {note.attachmentUrl && (!note.attachments || !Array.isArray(note.attachments) || note.attachments.length === 0) && (
                        <a
                          href={note.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mt-2.5 inline-flex items-center gap-2 text-xs rounded-xl px-3 py-1.5 font-medium transition-all ${
                            isAdmin 
                              ? "bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700" 
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                          }`}
                        >
                          <FiPaperclip className="shrink-0 text-sm" />
                          <span className="truncate">{note.attachmentName || "پیوست"}</span>
                          <FiDownload className="shrink-0 text-xs opacity-70 ml-auto" />
                        </a>
                      )}

                      {/* Multiple attachments */}
                      {note.attachments && Array.isArray(note.attachments) && note.attachments.length > 0 && (
                        <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-800/40 pt-2.5">
                          {note.attachments.map((att: any, idx: number) => (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-2 text-xs rounded-xl px-3 py-1.5 font-medium transition-all ${
                                isAdmin 
                                  ? "bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700" 
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                              }`}
                            >
                              <FiPaperclip className="shrink-0 text-sm" />
                              <span className="truncate flex-1">{att.name || `پیوست ${idx + 1}`}</span>
                              <FiDownload className="shrink-0 text-xs opacity-70" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 font-medium px-1">
                      <FiClock className="text-[10px] opacity-70" />
                      <span dir="ltr">{new Date(note.createdAt).toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Send message form */}
          {canInteract ? (
            <div className="mt-3">
              {errorMsg && (
                <div className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-200">
                  {errorMsg}
                </div>
              )}
              <div className="flex flex-col gap-3 relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  placeholder={t("notes.placeholder")}
                  rows={3}
                  maxLength={2000}
                  className={`min-h-[100px] w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 ${isDragging ? "border-primary bg-primary/5 border-dashed" : "border-slate-200 bg-slate-50"}`}
                />
                
                {isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-primary/10 backdrop-blur-sm pointer-events-none border-2 border-dashed border-primary z-10">
                    <p className="text-base font-bold text-primary">Drop files here to attach</p>
                  </div>
                )}
                
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl max-w-[220px] group shadow-sm transition-all hover:border-slate-300">
                        <FiFileText className="text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-700 font-medium truncate flex-1" title={file.name}>{file.name}</span>
                        <button 
                          type="button" 
                          onClick={() => removeFile(idx)} 
                          className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full p-1 transition-colors shrink-0"
                        >
                          <FiXCircle className="text-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors">
                    <FiPaperclip className="text-sm" />
                    {t("notes.attachFile")}
                    <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
                  </label>
                  <span className="text-[10px] text-slate-400 max-w-[150px] leading-tight">
                    Max 5MB per file<br/>(PDF, JPG, PNG, WEBP)
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={sendNote}
                  disabled={(!message.trim() && selectedFiles.length === 0) || sending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                >
                  <FiSend /> {sending ? t("notes.sending") : t("notes.send")}
                </button>
              </div>
            </div>
          ) : null}

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
