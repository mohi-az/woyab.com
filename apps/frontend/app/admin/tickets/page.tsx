import { getTranslations } from "next-intl/server";
import { AdminButton, AdminSection, AdminTable, StatusBadge, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { updateTicketStatus } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

const statuses = ["OPEN", "PENDING", "RESOLVED", "CLOSED"] as const;
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const inputClassName = "admin-input h-10 min-w-0 rounded-lg px-3 text-sm outline-none focus:border-sky-400";

export default async function AdminTicketsPage() {
  const [t, tickets] = await Promise.all([
    getTranslations("Admin"),
    prisma.supportTicket.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black text-white">{t("tickets.title")}</h1><p className="mt-2 text-slate-400">{t("tickets.description")}</p></div>
      <AdminSection title={t("tickets.list")}>
        <AdminTable>
          <table className={tableClassName}>
            <thead><tr><th className={thClassName}>{t("fields.ticket")}</th><th className={thClassName}>{t("fields.user")}</th><th className={thClassName}>{t("fields.priority")}</th><th className={thClassName}>{t("fields.status")}</th><th className={thClassName}>{t("fields.actions")}</th></tr></thead>
            <tbody className="divide-y divide-white/8">
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className={tdClassName}><strong className="text-white">{ticket.subject}</strong><p className="mt-2 max-w-xl whitespace-pre-line text-sm text-slate-400">{ticket.message}</p></td>
                  <td className={tdClassName}>{ticket.user?.name || ticket.user?.email || "-"}</td>
                  <td className={tdClassName}>{ticket.priority}</td>
                  <td className={tdClassName}><StatusBadge status={ticket.status} /></td>
                  <td className={tdClassName}>
                    <form action={updateTicketStatus} className="grid gap-2">
                      <input type="hidden" name="id" value={ticket.id} />
                      <select name="status" defaultValue={ticket.status} className={inputClassName}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                      <select name="priority" defaultValue={ticket.priority} className={inputClassName}>{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select>
                      <AdminButton tone="success">{t("actions.save")}</AdminButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
        {!tickets.length ? <p className="mt-4 rounded-lg border border-dashed border-white/10 p-8 text-center text-slate-400">{t("empty.noTickets")}</p> : null}
      </AdminSection>
    </div>
  );
}
