import { getTranslations } from "next-intl/server";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { ClaimDetailCard } from "@/components/dashboard/ClaimDetailCard";

export default async function DashboardClaimsPage() {
  const [userId, t] = await Promise.all([requireUserId(), getTranslations("Dashboard.claims")]);

  const claims = await prisma.businessClaim.findMany({
    where: { claimantUserId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      officialBusinessEmail: true,
      claimantName: true,
      verifiedAt: true,
      reviewedAt: true,
      decisionReason: true,
      business: { select: { businessName: true, slug: true } },
      notes: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          attachmentUrl: true,
          attachmentName: true,
          isAdminNote: true,
          createdAt: true,
          author: { select: { name: true, role: true } },
        },
      },
    },
  });

  const serialized = claims.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    verifiedAt: c.verifiedAt?.toISOString() ?? null,
    reviewedAt: c.reviewedAt?.toISOString() ?? null,
    notes: c.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">{t("title")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{t("description")}</p>
      </div>

      {serialized.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-bold text-slate-500">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {serialized.map((claim) => (
            <ClaimDetailCard key={claim.id} claim={claim} />
          ))}
        </div>
      )}
    </div>
  );
}
