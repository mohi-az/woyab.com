"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiExternalLink,
  FiMessageSquare,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { Link } from "@/i18n/navigation";
import { AdminButton, StatusBadge } from "@/components/admin/AdminPrimitives";
import { reviewBusinessChangeRequest } from "@/lib/admin-actions";

type ChangeRequest = {
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

export function AdminChangeRequestCard({ request }: { request: ChangeRequest }) {
  const t = useTranslations("Admin.changeRequests");
  const locale = useLocale();
  const isRtl = locale === "fa";
  const ArrowIcon = isRtl ? FiArrowLeft : FiArrowRight;

  const isStale = new Date(request.business.updatedAt).getTime() !== new Date(request.businessUpdatedAt).getTime();
  const snapshotObj = (request.snapshot && typeof request.snapshot === "object" ? request.snapshot : {}) as Record<string, unknown>;
  const payloadObj = (request.payload && typeof request.payload === "object" ? request.payload : {}) as Record<string, unknown>;

  // Relation badge configuration supporting both Light and Dark mode
  const relationConfig = {
    CUSTOMER: {
      label: t("relationTypes.CUSTOMER"),
      icon: FiUser,
      className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
    },
    EMPLOYEE: {
      label: t("relationTypes.EMPLOYEE"),
      icon: FiUsers,
      className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
    },
    OWNER: {
      label: t("relationTypes.OWNER"),
      icon: FiBriefcase,
      className: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    },
  }[request.submitterRelation] ?? {
    label: request.submitterRelation,
    icon: FiUser,
    className: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
  };

  const RelationIcon = relationConfig.icon;

  // Kind badge label
  const kindLabel = {
    DETAILS: t("kinds.DETAILS"),
    HOURS: t("kinds.HOURS"),
    ATTRIBUTES: t("kinds.ATTRIBUTES"),
    TAGS: t("kinds.TAGS"),
    SERVICE_CREATE: t("kinds.SERVICE_CREATE"),
    SERVICE_UPDATE: t("kinds.SERVICE_UPDATE"),
    SERVICE_DEACTIVATE: t("kinds.SERVICE_DEACTIVATE"),
  }[request.kind] ?? request.kind;

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

  const formattedDate = new Date(request.createdAt).toLocaleString(locale === "fa" ? "fa-IR" : locale === "de" ? "de-DE" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className="admin-section rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-6 text-slate-900 dark:text-slate-100 shadow-md dark:shadow-2xl backdrop-blur-md transition hover:border-slate-300 dark:hover:border-white/20">
      {/* Header Bar */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/businesses/${request.business.slug}`}
              target="_blank"
              className="admin-title group flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white transition hover:text-sky-600 dark:hover:text-sky-400"
            >
              <span>{request.business.businessName}</span>
              <FiExternalLink className="h-4 w-4 opacity-60 transition group-hover:opacity-100 text-slate-400 dark:text-slate-400" />
            </Link>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${relationConfig.className}`}>
              <RelationIcon className="h-3.5 w-3.5" />
              {relationConfig.label}
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300 px-3 py-1 text-xs font-bold">
              {kindLabel}
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <FiUser className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <strong className="text-slate-800 dark:text-slate-200">{request.submitter?.name || t("submitter")}</strong>
              {request.submitter?.email ? <span className="text-slate-500 dark:text-slate-400">({request.submitter.email})</span> : null}
            </span>
            <span className="flex items-center gap-1.5">
              <FiClock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <span>{formattedDate}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={request.status} />
          {isStale && request.status === "PENDING" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300 px-3 py-1 text-xs font-black">
              <FiAlertTriangle className="h-3.5 w-3.5" />
              {t("staleNotice")}
            </span>
          ) : null}
        </div>
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

      {/* Visual Diff Section (No JSON!) */}
      <div className="mt-5 space-y-3">
        {request.kind === "DETAILS" && detailsChanges.length > 0 ? (
          <div className="grid gap-3">
            {detailsChanges.map((change) => {
              const fieldKey = change.field as string;
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
          /* Fallback structured view for HOURS, ATTRIBUTES, etc. */
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-950/40 p-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{kindLabel}</h4>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
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

      {/* Collapsible Technical Raw JSON Accordion */}
      <details className="group mt-4 border-t border-slate-100 dark:border-white/5 pt-3">
        <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 transition hover:text-slate-800 dark:hover:text-slate-200">
          <FiChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          <span>{t("technicalData")}</span>
        </summary>
        <pre className="mt-3 max-h-60 overflow-auto rounded-xl border border-slate-200 dark:border-white/10 bg-slate-900 text-slate-100 dark:bg-black/60 dark:text-slate-300 p-4 text-[11px] font-mono">
          {JSON.stringify({ snapshot: request.snapshot, payload: request.payload }, null, 2)}
        </pre>
      </details>

      {/* Decision / Moderation Actions */}
      <div className="mt-5 border-t border-slate-100 dark:border-white/10 pt-4">
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
    </article>
  );
}
