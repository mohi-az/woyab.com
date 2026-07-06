import { getTranslations } from "next-intl/server";
import { AdminReportsTable, type AdminReportRow } from "@/components/admin/AdminReportsTable";
import { AdminSection } from "@/components/admin/AdminPrimitives";
import { prisma } from "@/lib/prisma";

export default async function AdminReportsPage() {
  const [t, reports] = await Promise.all([
    getTranslations("Admin"),
    prisma.directoryReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
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

  const rows: AdminReportRow[] = reports.map((report) => {
    const business = report.business ?? report.review?.business ?? null;
    const targetTitle = report.business?.businessName || report.review?.title || report.review?.comment || "-";
    const publicHref = business ? `/businesses/${business.slug}${report.review ? "#reviews" : ""}` : report.targetUrl;

    return {
      id: report.id,
      reason: report.reason,
      reasonCode: report.reasonCode,
      message: report.message,
      status: report.status,
      targetTitle,
      targetType: report.business ? "BUSINESS" : "REVIEW",
      businessName: business?.businessName ?? null,
      publicHref,
      reporter: report.reporter?.name || report.reporter?.email || report.reporterName || report.reporterEmail || "-",
      reporterEmail: report.reporterEmail,
      createdAt: report.createdAt.toISOString(),
      resolvedAt: report.resolvedAt?.toISOString() ?? null,
      resolvedBy: report.resolvedBy?.name || report.resolvedBy?.email || null,
      decisionReason: report.decisionReason,
      actionTaken: report.actionTaken,
      moderatorNote: report.moderatorNote,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">{t("reports.title")}</h1>
        <p className="mt-2 text-slate-400">{t("reports.description")}</p>
      </div>
      <AdminSection title={t("reports.list")}>
        <AdminReportsTable reports={rows} />
      </AdminSection>
    </div>
  );
}
