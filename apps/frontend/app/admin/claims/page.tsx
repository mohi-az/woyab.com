import { getTranslations } from "next-intl/server";
import { AdminSection } from "@/components/admin/AdminPrimitives";
import { AdminClaimsTable } from "@/features/admin/AdminClaimsTable";
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
            attachments: true,
            createdAt: true,
            author: { select: { name: true, role: true } },
          },
        },
      },
    }),
  ]);

  const translations = {
    "fields.business": t("fields.business"),
    "fields.claimant": t("fields.claimant"),
    "fields.status": t("fields.status"),
    "fields.actions": t("fields.actions"),
    overview: t("claims.overview"),
    moderation: t("claims.moderation"),
    notesAndMessages: t("claims.notesAndMessages"),
    sendMessage: t("claims.sendMessage"),
    noNotes: t("claims.noNotes"),
    newStatus: t("claims.newStatus"),
    decisionReason: t("claims.decisionReason"),
    decisionReasonPlaceholder: t("claims.decisionReasonPlaceholder"),
    saveStatus: t("claims.saveStatus"),
    officialBusinessEmail: t("claims.officialBusinessEmail"),
    claimDetails: t("claims.claimDetails"),
    noActionAvailable: t("claims.noActionAvailable"),
    searchBusiness: t("claims.searchBusiness"),
    searchClaimant: t("claims.searchClaimant"),
    search: t("claims.search"),
    reset: t("claims.reset")
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black text-white">{t("claims.title")}</h1><p className="mt-2 text-slate-400">{t("claims.description")}</p></div>
      <AdminSection title={t("claims.list")}>
        <AdminClaimsTable claims={claims} translations={translations} />
      </AdminSection>
    </div>
  );
}
