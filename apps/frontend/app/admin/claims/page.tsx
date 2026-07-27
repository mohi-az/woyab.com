import { getTranslations } from "next-intl/server";
import { AdminButton, AdminSection, AdminTable, StatusBadge, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { addClaimNote, updateClaimStatus } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

const statuses = ["UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"] as const;
const inputClassName = "admin-input h-10 min-w-0 rounded-lg px-3 text-sm outline-none focus:border-sky-400";

export default async function AdminClaimsPage() {
  const [t, claims] = await Promise.all([
    getTranslations("Admin"),
    prisma.businessClaim.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        business: { select: { businessName: true, slug: true, owner: { select: { name: true, email: true } } } },
        claimant: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
        notes: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            isAdminNote: true,
            attachmentUrl: true,
            attachmentName: true,
            createdAt: true,
            author: { select: { name: true, role: true } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black text-white">{t("claims.title")}</h1><p className="mt-2 text-slate-400">{t("claims.description")}</p></div>
      <AdminSection title={t("claims.list")}>
        <AdminTable>
          <table className={tableClassName}>
            <thead><tr><th className={thClassName}>{t("fields.business")}</th><th className={thClassName}>{t("fields.claimant")}</th><th className={thClassName}>Notes</th><th className={thClassName}>{t("fields.status")}</th><th className={thClassName}>{t("fields.actions")}</th></tr></thead>
            <tbody className="divide-y divide-white/8">
              {claims.map((claim) => (
                <tr key={claim.id}>
                  <td className={tdClassName}>
                    <strong className="text-white">{claim.business.businessName}</strong>
                    <p className="mt-1 text-xs text-slate-500">{claim.business.slug}</p>
                    <p className="mt-1 text-xs text-slate-400">Owner: {claim.business.owner?.name || claim.business.owner?.email || "-"}</p>
                  </td>
                  <td className={tdClassName}>
                    {claim.claimantName}<br />
                    <span className="text-xs text-slate-400">{claim.claimantEmail}</span>
                    <p className="mt-1 text-xs text-sky-300">Business email: {claim.officialBusinessEmail || "-"}</p>
                    <p className="mt-1 text-xs text-slate-500">Email verified: {claim.verifiedAt ? claim.verifiedAt.toISOString() : "No"}</p>
                    <p className="mt-1 text-xs text-slate-500">{claim.claimant ? "Registered account" : "No account attached"}</p>
                  </td>
                  <td className={tdClassName}>
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {claim.notes.map((note) => (
                        <div key={note.id} className={`rounded-lg p-2 text-xs ${note.isAdminNote ? "border border-sky-500/30 bg-sky-950/50" : "bg-white/5"}`}>
                          <span className={`font-bold ${note.isAdminNote ? "text-sky-400" : "text-slate-300"}`}>
                            {note.isAdminNote ? "Admin" : note.author.name || "User"}
                          </span>
                          <span className="ml-2 text-slate-500">{note.createdAt.toLocaleString("de-DE")}</span>
                          <p className="mt-1 text-slate-300">{note.content}</p>
                          {note.attachmentUrl ? (
                            <a href={note.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sky-400 hover:text-sky-300">📎 {note.attachmentName}</a>
                          ) : null}
                        </div>
                      ))}
                      {!claim.notes.length ? <p className="text-xs text-slate-500">No notes yet.</p> : null}
                    </div>
                    {/* Admin note form */}
                    <form action={addClaimNote} className="mt-2 grid gap-2">
                      <input type="hidden" name="claimId" value={claim.id} />
                      <textarea name="content" required minLength={1} placeholder="Send a message or request documents..." className="admin-input min-h-16 rounded-lg px-3 py-2 text-xs" />
                      <AdminButton tone="default">Send Note</AdminButton>
                    </form>
                  </td>
                  <td className={tdClassName}><StatusBadge status={claim.status} /></td>
                  <td className={tdClassName}>
                    {claim.status === "UNDER_REVIEW" ? <form action={updateClaimStatus} className="grid gap-2">
                      <input type="hidden" name="id" value={claim.id} />
                      <select name="status" defaultValue={claim.status} className={inputClassName}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                      <textarea name="decisionReason" required minLength={3} placeholder="Decision reason" className="admin-input min-h-20 rounded-lg px-3 py-2 text-sm" />
                      <AdminButton tone="success">{t("actions.save")}</AdminButton>
                    </form> : <span className="text-xs text-slate-500">No moderation action is available for this status.</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
        {!claims.length ? <p className="mt-4 rounded-lg border border-dashed border-white/10 p-8 text-center text-slate-400">{t("empty.noClaims")}</p> : null}
      </AdminSection>
    </div>
  );
}
