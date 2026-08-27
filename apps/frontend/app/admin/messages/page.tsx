import { getTranslations } from "next-intl/server";
import { AdminButton, AdminSection, AdminTable, StatusBadge, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { archivePublicContactMessage, updateContactMessageStatus } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

export default async function AdminMessagesPage() {
  const [t, messages, publicMessages] = await Promise.all([
    getTranslations("Admin"),
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { business: { select: { businessName: true, slug: true, owner: { select: { name: true, email: true } } } } },
    }),
    prisma.publicContactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black text-white">{t("messages.title")}</h1><p className="mt-2 text-slate-400">{t("messages.description")}</p></div>
      <AdminSection title={t("messages.list")}>
        <AdminTable>
          <table className={tableClassName}>
            <thead><tr><th className={thClassName}>{t("fields.from")}</th><th className={thClassName}>{t("fields.business")}</th><th className={thClassName}>{t("fields.message")}</th><th className={thClassName}>{t("fields.status")}</th><th className={thClassName}>Email delivery</th><th className={thClassName}>{t("fields.actions")}</th></tr></thead>
            <tbody className="divide-y divide-white/8">
              {messages.map((message) => (
                <tr key={message.id}>
                  <td className={tdClassName}><strong className="text-white">{message.name}</strong><p className="mt-1 text-xs text-slate-400">{message.email}<br />{message.phone || ""}</p></td>
                  <td className={tdClassName}>{message.business.businessName}<p className="mt-1 text-xs text-slate-500">{message.business.owner?.name || message.business.owner?.email || "No owner"}</p></td>
                  <td className={tdClassName}><p className="max-w-xl whitespace-pre-line text-sm text-slate-400">{message.message}</p></td>
                  <td className={tdClassName}><StatusBadge status={message.status} /></td>
                  <td className={tdClassName}><StatusBadge status={message.emailStatus} />{message.emailError ? <p className="mt-2 max-w-xs text-xs text-rose-300">{message.emailError}</p> : null}</td>
                  <td className={tdClassName}>
                    {message.status !== "ARCHIVED" ? <form action={updateContactMessageStatus} className="grid gap-2">
                      <input type="hidden" name="id" value={message.id} />
                      <input type="hidden" name="status" value="ARCHIVED" />
                      <AdminButton tone="success">Archive</AdminButton>
                    </form> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
        {!messages.length ? <p className="mt-4 rounded-lg border border-dashed border-white/10 p-8 text-center text-slate-400">{t("empty.noMessages")}</p> : null}
      </AdminSection>
      <AdminSection title={t("publicContact.list")}>
        <AdminTable>
          <table className={tableClassName}>
            <thead><tr><th className={thClassName}>{t("fields.from")}</th><th className={thClassName}>{t("publicContact.subject")}</th><th className={thClassName}>{t("fields.message")}</th><th className={thClassName}>{t("fields.status")}</th><th className={thClassName}>Email delivery</th><th className={thClassName}>{t("fields.actions")}</th></tr></thead>
            <tbody className="divide-y divide-white/8">
              {publicMessages.map((message) => (
                <tr key={message.id}>
                  <td className={tdClassName}><strong className="text-white">{message.name}</strong><p className="mt-1 text-xs text-slate-400">{message.email}<br />{message.phone || ""}</p></td>
                  <td className={tdClassName}>{t(`publicContact.subjects.${message.subject}`)}</td>
                  <td className={tdClassName}><p className="max-w-xl whitespace-pre-line text-sm text-slate-400">{message.message}</p></td>
                  <td className={tdClassName}><StatusBadge status={message.status} /></td>
                  <td className={tdClassName}><StatusBadge status={message.notificationStatus} />{message.notificationError ? <p className="mt-2 max-w-xs text-xs text-rose-300">{message.notificationError}</p> : null}<p className="mt-2 text-xs text-slate-500">Receipt: {message.acknowledgementStatus}</p></td>
                  <td className={tdClassName}>
                    {message.status !== "ARCHIVED" ? <form action={archivePublicContactMessage}><input type="hidden" name="id" value={message.id} /><AdminButton tone="success">Archive</AdminButton></form> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
        {!publicMessages.length ? <p className="mt-4 rounded-lg border border-dashed border-white/10 p-8 text-center text-slate-400">{t("empty.noPublicContact")}</p> : null}
      </AdminSection>
    </div>
  );
}
