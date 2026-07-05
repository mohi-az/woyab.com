import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AdminButton, AdminSection, AdminTable, StatusBadge, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { updateReportStatus } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

const statuses = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as const;
const inputClassName = "admin-input h-10 min-w-0 rounded-lg px-3 text-sm outline-none focus:border-sky-400";
const textareaClassName = "admin-input min-h-20 min-w-0 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400";
const dateFormatter = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminReportsPage() {
  const [t, reports] = await Promise.all([
    getTranslations("Admin"),
    prisma.directoryReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        business: { select: { businessName: true, slug: true } },
        review: {
          select: {
            title: true,
            comment: true,
            business: { select: { businessName: true, slug: true } },
          },
        },
        reporter: { select: { name: true, email: true } },
        resolvedBy: { select: { name: true, email: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black text-white">{t("reports.title")}</h1><p className="mt-2 text-slate-400">{t("reports.description")}</p></div>
      <AdminSection title={t("reports.list")}>
        <AdminTable>
          <table className={tableClassName}>
            <thead><tr><th className={thClassName}>{t("fields.report")}</th><th className={thClassName}>{t("fields.target")}</th><th className={thClassName}>{t("fields.reporter")}</th><th className={thClassName}>{t("fields.time")}</th><th className={thClassName}>{t("fields.status")}</th><th className={thClassName}>{t("fields.actions")}</th></tr></thead>
            <tbody className="divide-y divide-white/8">
              {reports.map((report) => {
                const business = report.business ?? report.review?.business ?? null;
                const targetTitle = report.business?.businessName || report.review?.title || report.review?.comment || "-";
                const publicHref = business ? `/businesses/${business.slug}${report.review ? "#reviews" : ""}` : report.targetUrl;
                const reporter = report.reporter?.name || report.reporter?.email || report.reporterName || report.reporterEmail || "-";

                return (
                  <tr key={report.id}>
                    <td className={tdClassName}>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-white">{report.reason}</strong>
                        <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] font-black uppercase text-slate-300">{report.reasonCode}</span>
                      </div>
                      <p className="mt-2 max-w-xl whitespace-pre-line text-sm text-slate-400">{report.message || "-"}</p>
                      {report.decisionReason || report.actionTaken ? (
                        <p className="mt-2 max-w-xl text-xs text-slate-500">
                          {[report.decisionReason, report.actionTaken].filter(Boolean).join(" / ")}
                        </p>
                      ) : null}
                    </td>
                    <td className={tdClassName}>
                      <p className="font-bold text-white">{targetTitle}</p>
                      {business ? <p className="mt-1 text-xs text-slate-400">{business.businessName}</p> : null}
                      {publicHref ? (
                        <Link href={publicHref} className="mt-2 inline-flex text-xs font-bold text-sky-300 hover:text-sky-200">
                          {t("actions.viewPublic")}
                        </Link>
                      ) : null}
                    </td>
                    <td className={tdClassName}>
                      <p>{reporter}</p>
                      {report.reporterEmail && report.reporterEmail !== reporter ? <p className="mt-1 text-xs text-slate-400">{report.reporterEmail}</p> : null}
                    </td>
                    <td className={tdClassName}>{dateFormatter.format(report.createdAt)}</td>
                    <td className={tdClassName}><StatusBadge status={report.status} /></td>
                    <td className={tdClassName}>
                      <form action={updateReportStatus} className="grid min-w-64 gap-2">
                        <input type="hidden" name="id" value={report.id} />
                        <select name="status" defaultValue={report.status} className={inputClassName}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                        <textarea name="decisionReason" defaultValue={report.decisionReason ?? ""} placeholder="Decision reason" className={textareaClassName} />
                        <input name="actionTaken" defaultValue={report.actionTaken ?? ""} placeholder="Action taken" className={inputClassName} />
                        <textarea name="moderatorNote" defaultValue={report.moderatorNote ?? ""} placeholder="Internal note" className={textareaClassName} />
                        <AdminButton tone="success">{t("actions.save")}</AdminButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTable>
        {!reports.length ? <p className="mt-4 rounded-lg border border-dashed border-white/10 p-8 text-center text-slate-400">{t("empty.noReports")}</p> : null}
      </AdminSection>
    </div>
  );
}
