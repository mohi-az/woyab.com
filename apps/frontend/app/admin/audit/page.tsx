import { getLocale, getTranslations } from "next-intl/server";
import { AdminSection, AdminTable, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { isAppLocale } from "@/i18n/config";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export default async function AdminAuditPage() {
  await requireSuperAdmin();
  const [t, requestedLocale, logs] = await Promise.all([
    getTranslations("Admin"),
    getLocale(),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: { select: { name: true, email: true, role: true } } },
    }),
  ]);
  const locale = isAppLocale(requestedLocale) ? requestedLocale : "de";
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black text-white">{t("audit.title")}</h1><p className="mt-2 text-slate-400">{t("audit.description")}</p></div>
      <AdminSection title={t("audit.list")}>
        <AdminTable>
          <table className={tableClassName}>
            <thead><tr><th className={thClassName}>{t("fields.time")}</th><th className={thClassName}>{t("fields.actor")}</th><th className={thClassName}>{t("fields.action")}</th><th className={thClassName}>{t("fields.entity")}</th><th className={thClassName}>{t("fields.metadata")}</th></tr></thead>
            <tbody className="divide-y divide-white/8">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className={tdClassName}>{dateFormatter.format(log.createdAt)}</td>
                  <td className={tdClassName}>{log.actor?.name || log.actor?.email || "-"}</td>
                  <td className={tdClassName}><span className="font-black text-white">{log.action}</span></td>
                  <td className={tdClassName}>{log.entityType}<br /><span className="text-xs text-slate-500">{log.entityId}</span></td>
                  <td className={tdClassName}><pre className="max-w-md overflow-x-auto rounded bg-black/20 p-3 text-xs text-slate-300">{JSON.stringify(log.metadata ?? {}, null, 2)}</pre></td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      </AdminSection>
    </div>
  );
}
