import { getTranslations } from "next-intl/server";
import { AdminButton, AdminSection, AdminTable, StatusBadge, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { updateClaimStatus } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

const statuses = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
const inputClassName = "admin-input h-10 min-w-0 rounded-lg px-3 text-sm outline-none focus:border-sky-400";

export default async function AdminClaimsPage() {
  const [t, claims] = await Promise.all([
    getTranslations("Admin"),
    prisma.businessClaim.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        business: { select: { businessName: true, slug: true } },
        claimant: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black text-white">{t("claims.title")}</h1><p className="mt-2 text-slate-400">{t("claims.description")}</p></div>
      <AdminSection title={t("claims.list")}>
        <AdminTable>
          <table className={tableClassName}>
            <thead><tr><th className={thClassName}>{t("fields.business")}</th><th className={thClassName}>{t("fields.claimant")}</th><th className={thClassName}>{t("fields.message")}</th><th className={thClassName}>{t("fields.status")}</th><th className={thClassName}>{t("fields.actions")}</th></tr></thead>
            <tbody className="divide-y divide-white/8">
              {claims.map((claim) => (
                <tr key={claim.id}>
                  <td className={tdClassName}><strong className="text-white">{claim.business.businessName}</strong><p className="mt-1 text-xs text-slate-500">{claim.business.slug}</p></td>
                  <td className={tdClassName}>{claim.claimantName}<br /><span className="text-xs text-slate-400">{claim.claimantEmail}</span></td>
                  <td className={tdClassName}><p className="max-w-xl whitespace-pre-line text-sm text-slate-400">{claim.message || "-"}</p></td>
                  <td className={tdClassName}><StatusBadge status={claim.status} /></td>
                  <td className={tdClassName}>
                    <form action={updateClaimStatus} className="grid gap-2">
                      <input type="hidden" name="id" value={claim.id} />
                      <select name="status" defaultValue={claim.status} className={inputClassName}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                      <AdminButton tone="success">{t("actions.save")}</AdminButton>
                    </form>
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
