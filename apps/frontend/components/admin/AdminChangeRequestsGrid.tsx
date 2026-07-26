"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiCheck,
  FiClock,
  FiEdit3,
  FiExternalLink,
  FiFilter,
  FiMessageSquare,
  FiSearch,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { Link } from "@/i18n/navigation";
import { AdminButton, AdminTable, StatusBadge, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { reviewBusinessChangeRequest } from "@/lib/admin-actions";

export type ChangeRequestRow = {
  id: string;
  businessId: string;
  kind: string;
  submitterRelation: "CUSTOMER" | "EMPLOYEE" | "OWNER" | string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  snapshot: unknown;
  payload: unknown;
  additionalContext: string | null;
  evidenceUrl: string | null;
  decisionReason: string | null;
  createdAt: Date;
  businessUpdatedAt: Date;
  business: {
    businessName: string;
    slug: string;
    updatedAt: Date;
  };
  submitter: {
    name: string | null;
    email: string | null;
  } | null;
  reviewedBy: {
    name: string | null;
    email: string | null;
  } | null;
};

export function AdminChangeRequestsGrid({ requests }: { requests: ChangeRequestRow[] }) {
  const t = useTranslations("Admin.changeRequests");
  const locale = useLocale();
  const isRtl = locale === "fa";
  const ArrowIcon = isRtl ? FiArrowLeft : FiArrowRight;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequestRow | null>(null);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Status filter
      if (statusFilter !== "ALL" && req.status !== statusFilter) return false;
      // Role filter
      if (roleFilter !== "ALL" && req.submitterRelation !== roleFilter) return false;
      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const bName = req.business.businessName.toLowerCase();
        const sName = req.submitter?.name?.toLowerCase() || "";
        const sEmail = req.submitter?.email?.toLowerCase() || "";
        if (!bName.includes(query) && !sName.includes(query) && !sEmail.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [requests, statusFilter, roleFilter, search]);

  const relationConfig = (relation: string) => {
    switch (relation) {
      case "CUSTOMER":
        return {
          label: t("relationTypes.CUSTOMER"),
          icon: FiUser,
          className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
        };
      case "EMPLOYEE":
        return {
          label: t("relationTypes.EMPLOYEE"),
          icon: FiUsers,
          className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
        };
      case "OWNER":
        return {
          label: t("relationTypes.OWNER"),
          icon: FiBriefcase,
          className: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
        };
      default:
        return {
          label: relation,
          icon: FiUser,
          className: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
        };
    }
  };

  const kindLabel = (kind: string) => {
    const map: Record<string, string> = {
      DETAILS: t("kinds.DETAILS"),
      HOURS: t("kinds.HOURS"),
      ATTRIBUTES: t("kinds.ATTRIBUTES"),
      TAGS: t("kinds.TAGS"),
      SERVICE_CREATE: t("kinds.SERVICE_CREATE"),
      SERVICE_UPDATE: t("kinds.SERVICE_UPDATE"),
      SERVICE_DEACTIVATE: t("kinds.SERVICE_DEACTIVATE"),
    };
    return map[kind] ?? kind;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString(locale === "fa" ? "fa-IR" : locale === "de" ? "de-DE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/60 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute inset-y-0 start-3.5 my-auto h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="admin-input h-10 w-full rounded-xl ps-10 pe-4 text-sm outline-none"
            />
          </div>

          {/* Status Select */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-input h-10 rounded-xl px-3 text-sm outline-none cursor-pointer"
            >
              <option value="ALL">{t("filters.allStatuses")}</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          {/* Role Select */}
          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="admin-input h-10 rounded-xl px-3 text-sm outline-none cursor-pointer"
            >
              <option value="ALL">{t("filters.allRoles")}</option>
              <option value="CUSTOMER">{t("relationTypes.CUSTOMER")}</option>
              <option value="EMPLOYEE">{t("relationTypes.EMPLOYEE")}</option>
              <option value="OWNER">{t("relationTypes.OWNER")}</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          ({filteredRequests.length} / {requests.length})
        </div>
      </div>

      {/* Compact Table Grid */}
      <AdminTable>
        <table className={tableClassName}>
          <thead>
            <tr>
              <th className={thClassName}>کسب‌وکار</th>
              <th className={thClassName}>ارسال‌کننده</th>
              <th className={thClassName}>نوع تغییر</th>
              <th className={thClassName}>تاریخ ثبت</th>
              <th className={thClassName}>وضعیت</th>
              <th className={thClassName}>عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/8">
            {filteredRequests.map((req) => {
              const rel = relationConfig(req.submitterRelation);
              const RelIcon = rel.icon;
              const isStale = new Date(req.business.updatedAt).getTime() !== new Date(req.businessUpdatedAt).getTime();

              return (
                <tr
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className="cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-white/[.04]"
                >
                  {/* Business Name */}
                  <td className={tdClassName}>
                    <div className="flex items-center gap-2">
                      <strong className="admin-title font-black text-slate-900 dark:text-white">
                        {req.business.businessName}
                      </strong>
                      <Link
                        href={`/businesses/${req.business.slug}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 hover:text-sky-500 transition"
                      >
                        <FiExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{req.business.slug}</span>
                  </td>

                  {/* Submitter */}
                  <td className={tdClassName}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {req.submitter?.name || t("submitter")}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${rel.className}`}>
                        <RelIcon className="h-3 w-3" />
                        {rel.label}
                      </span>
                    </div>
                    {req.submitter?.email ? (
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{req.submitter.email}</span>
                    ) : null}
                  </td>

                  {/* Kind */}
                  <td className={tdClassName}>
                    <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300 px-2.5 py-0.5 text-xs font-bold">
                      {kindLabel(req.kind)}
                    </span>
                  </td>

                  {/* Date */}
                  <td className={tdClassName}>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{formatDate(req.createdAt)}</span>
                  </td>

                  {/* Status */}
                  <td className={tdClassName}>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={req.status} />
                      {isStale && req.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300 px-2 py-0.5 text-[10px] font-black">
                          <FiAlertTriangle className="h-3 w-3" />
                          STALE
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className={tdClassName}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRequest(req);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20 transition cursor-pointer"
                    >
                      <FiEdit3 className="h-3.5 w-3.5" />
                      {t("reviewAction")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </AdminTable>

      {!filteredRequests.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
          {t("empty")}
        </div>
      ) : null}

      {/* Moderation Modal Popup */}
      {selectedRequest ? (
        <ModalPopup
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          ArrowIcon={ArrowIcon}
        />
      ) : null}
    </div>
  );
}

function ModalPopup({
  request,
  onClose,
  ArrowIcon,
}: {
  request: ChangeRequestRow;
  onClose: () => void;
  ArrowIcon: React.ComponentType<{ className?: string }>;
}) {
  const t = useTranslations("Admin.changeRequests");
  const locale = useLocale();

  const isStale = new Date(request.business.updatedAt).getTime() !== new Date(request.businessUpdatedAt).getTime();
  const snapshotObj = (request.snapshot && typeof request.snapshot === "object" ? request.snapshot : {}) as Record<string, unknown>;
  const payloadObj = (request.payload && typeof request.payload === "object" ? request.payload : {}) as Record<string, unknown>;

  // Extract structured changes for DETAILS
  const detailsChanges: Array<{ field: string; before: unknown; after: unknown }> = [];
  if (request.kind === "DETAILS" && Array.isArray(payloadObj.changes)) {
    for (const item of payloadObj.changes) {
      if (item && typeof item === "object" && "field" in item && "value" in item && typeof item.field === "string") {
        const fieldName = item.field;
        detailsChanges.push({
          field: fieldName,
          before: snapshotObj[fieldName],
          after: item.value,
        });
      }
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 shadow-2xl sm:p-8">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black">{t("modalTitle")}</h2>
              <StatusBadge status={request.status} />
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {request.business.businessName} ({request.business.slug})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Submitter Notes */}
        {request.additionalContext ? (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-950 dark:border-sky-500/20 dark:bg-sky-500/5 dark:text-sky-200">
            <div className="flex items-start gap-2.5">
              <FiMessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
              <div>
                <span className="block text-xs font-bold text-sky-800 dark:text-sky-300">{t("additionalContext")}:</span>
                <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-800 dark:text-slate-200">{request.additionalContext}</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Visual Diff Cards (No JSON!) */}
        <div className="mt-5 space-y-3">
          {request.kind === "DETAILS" && detailsChanges.length > 0 ? (
            <div className="grid gap-3">
              {detailsChanges.map((change) => {
                const fieldKey = change.field;
                let label = fieldKey;
                try {
                  label = t(`fields.${fieldKey}` as any) || fieldKey;
                } catch {
                  label = fieldKey;
                }

                const beforeStr = change.before !== null && change.before !== undefined && change.before !== ""
                  ? String(change.before)
                  : t("noCurrentValue");

                const afterStr = change.after !== null && change.after !== undefined && change.after !== ""
                  ? String(change.after)
                  : t("noCurrentValue");

                return (
                  <div key={change.field} className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-950/40 p-4">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      {/* Before Box */}
                      <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-950 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                        <span className="block text-[11px] font-black uppercase tracking-wide text-rose-700 dark:text-rose-400/80">{t("beforeValue")}</span>
                        <p className="mt-1 font-semibold text-rose-900 dark:text-rose-200 line-through decoration-rose-400/60">{beforeStr}</p>
                      </div>

                      {/* Arrow Divider */}
                      <div className="grid h-8 w-8 place-items-center self-center justify-self-center rounded-full border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 shadow-sm">
                        <ArrowIcon className="h-4 w-4" />
                      </div>

                      {/* After Box */}
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                        <span className="block text-[11px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-400/80">{t("afterValue")}</span>
                        <p className="mt-1 font-extrabold text-emerald-950 dark:text-emerald-200">{afterStr}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Structured view for HOURS, ATTRIBUTES, etc. */
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-950/40 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-950 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  <span className="block font-black text-rose-700 dark:text-rose-400/80 mb-1">{t("beforeValue")}</span>
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(request.snapshot, null, 2)}</pre>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <span className="block font-black text-emerald-700 dark:text-emerald-400/80 mb-1">{t("afterValue")}</span>
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(request.payload, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Decision & Moderation Form */}
        <div className="mt-6 border-t border-slate-100 dark:border-white/10 pt-4">
          {request.status === "PENDING" ? (
            <form action={reviewBusinessChangeRequest} className="grid gap-3">
              <input type="hidden" name="id" value={request.id} />
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("decisionReason")}</label>
                <textarea
                  name="decisionReason"
                  required
                  minLength={3}
                  placeholder={t("decisionReasonPlaceholder")}
                  className="admin-input w-full min-h-20 rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <AdminButton name="decision" value="REJECT" tone="danger" type="submit">
                  <FiX className="h-4 w-4" />
                  {t("rejectAction")}
                </AdminButton>
                <AdminButton name="decision" value="APPROVE" tone="success" type="submit">
                  <FiCheck className="h-4 w-4" />
                  {t("approveAction")}
                </AdminButton>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-950/20 p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
                <span>{t("decisionReason")}:</span>
                {request.reviewedBy ? (
                  <span>Moderator: {request.reviewedBy.name || request.reviewedBy.email}</span>
                ) : null}
              </div>
              <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-200">
                {request.decisionReason || "No decision reason recorded."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
