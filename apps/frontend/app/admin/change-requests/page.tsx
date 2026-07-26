import { getTranslations } from "next-intl/server";
import { AdminSection } from "@/components/admin/AdminPrimitives";
import { AdminChangeRequestsGrid } from "@/components/admin/AdminChangeRequestsGrid";
import { prisma } from "@/lib/prisma";

export default async function AdminChangeRequestsPage() {
  const [t, requests] = await Promise.all([
    getTranslations("Admin.changeRequests"),
    prisma.businessChangeRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        business: { select: { businessName: true, slug: true, updatedAt: true } },
        submitter: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-title text-3xl font-black text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="admin-muted mt-2 text-[15px] font-medium text-slate-600 dark:text-slate-400">{t("description")}</p>
      </div>
      <AdminSection title={t("list")}>
        <AdminChangeRequestsGrid requests={requests} />
      </AdminSection>
    </div>
  );
}
