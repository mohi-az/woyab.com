import { getTranslations } from "next-intl/server";
import { AdminButton, AdminSection, AdminTable, StatusBadge, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { updateReportStatus } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

const statuses = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as const;
const inputClassName = "admin-input h-10 min-w-0 rounded-lg px-3 text-sm outline-none focus:border-sky-400";

export default async function AdminReportsPage() {
  const [t, reports] = await Promise.all([
    getTranslations("Admin"),
    prisma.directoryReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        business: { select: { businessName: true, slug: true } },
        review: { select: { title: true, comment: true } },
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
            <thead><tr><th className={thClassName}>{t("fields.report")}</th><th className={thClassName}>{t("fields.target")}</th><th className={thClassName}>{t("fields.reporter")}</th><th className={thClassName}>{t("fields.status")}</th><th className={thClassName}>{t("fields.actions")}</th></tr></thead>
            <tbody className="divide-y divide-white/8">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className={tdClassName}><strong className="text-white">{report.reason}</strong><p className="mt-2 max-w-xl whitespace-pre-line text-sm text-slate-400">{report.message || "-"}</p></td>
                  <td className={tdClassName}>{report.business?.businessName || report.review?.title || report.review?.comment || "-"}</td>
                  <td className={tdClassName}>{report.reporter?.name || report.reporter?.email || "-"}</td>
                  <td className={tdClassName}><StatusBadge status={report.status} /></td>
                  <td className={tdClassName}>
                    <form action={updateReportStatus} className="grid gap-2">
                      <input type="hidden" name="id" value={report.id} />
                      <select name="status" defaultValue={report.status} className={inputClassName}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                      <AdminButton tone="success">{t("actions.save")}</AdminButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
        {!reports.length ? <p className="mt-4 rounded-lg border border-dashed border-white/10 p-8 text-center text-slate-400">{t("empty.noReports")}</p> : null}
      </AdminSection>
    </div>
  );
}
