import { getTranslations } from "next-intl/server";
import { AdminButton, AdminSection, AdminTable, StatusBadge, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { updateContactMessageStatus } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

const statuses = ["NEW", "READ", "ARCHIVED"] as const;
const inputClassName = "admin-input h-10 min-w-0 rounded-lg px-3 text-sm outline-none focus:border-sky-400";

export default async function AdminMessagesPage() {
  const [t, messages] = await Promise.all([
    getTranslations("Admin"),
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { business: { select: { businessName: true, slug: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black text-white">{t("messages.title")}</h1><p className="mt-2 text-slate-400">{t("messages.description")}</p></div>
      <AdminSection title={t("messages.list")}>
        <AdminTable>
          <table className={tableClassName}>
            <thead><tr><th className={thClassName}>{t("fields.from")}</th><th className={thClassName}>{t("fields.business")}</th><th className={thClassName}>{t("fields.message")}</th><th className={thClassName}>{t("fields.status")}</th><th className={thClassName}>{t("fields.actions")}</th></tr></thead>
            <tbody className="divide-y divide-white/8">
              {messages.map((message) => (
                <tr key={message.id}>
                  <td className={tdClassName}><strong className="text-white">{message.name}</strong><p className="mt-1 text-xs text-slate-400">{message.email}<br />{message.phone || ""}</p></td>
                  <td className={tdClassName}>{message.business.businessName}</td>
                  <td className={tdClassName}><p className="max-w-xl whitespace-pre-line text-sm text-slate-400">{message.message}</p><p className="mt-2 text-xs text-slate-500">{message.deliveryMode || "stored"}</p></td>
                  <td className={tdClassName}><StatusBadge status={message.status} /></td>
                  <td className={tdClassName}>
                    <form action={updateContactMessageStatus} className="grid gap-2">
                      <input type="hidden" name="id" value={message.id} />
                      <select name="status" defaultValue={message.status} className={inputClassName}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                      <AdminButton tone="success">{t("actions.save")}</AdminButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
        {!messages.length ? <p className="mt-4 rounded-lg border border-dashed border-white/10 p-8 text-center text-slate-400">{t("empty.noMessages")}</p> : null}
      </AdminSection>
    </div>
  );
}
