import { AdminButton, AdminSection, StatusBadge } from "@/components/admin/AdminPrimitives";
import { reviewRetentionItem } from "@/lib/admin-actions";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export default async function AdminRetentionPage() {
  await requireSuperAdmin();
  const now = new Date();
  const [claims, changeRequests] = await Promise.all([
    prisma.businessClaim.findMany({
      where: { anonymizedAt: null, retentionReviewAt: { lte: now }, OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: now } }] },
      orderBy: { retentionReviewAt: "asc" }, take: 100,
      include: { business: { select: { businessName: true } } },
    }),
    prisma.businessChangeRequest.findMany({
      where: { anonymizedAt: null, retentionReviewAt: { lte: now }, OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: now } }] },
      orderBy: { retentionReviewAt: "asc" }, take: 100,
      include: { business: { select: { businessName: true } } },
    }),
  ]);

  const items = [
    ...claims.map((item) => ({ type: "claim" as const, id: item.id, business: item.business.businessName, status: item.status, reviewAt: item.retentionReviewAt!, summary: item.claimantEmail })),
    ...changeRequests.map((item) => ({ type: "changeRequest" as const, id: item.id, business: item.business.businessName, status: item.status, reviewAt: item.retentionReviewAt!, summary: `${item.submitterRelation} · ${item.kind}` })),
  ].sort((a, b) => a.reviewAt.getTime() - b.reviewAt.getTime());

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-black text-white">Retention review</h1><p className="mt-2 text-slate-400">Anonymize expired records or place a documented, time-limited legal hold.</p></div>
    <AdminSection title="Review queue">
      <div className="grid gap-3">{items.map((item) => <article key={`${item.type}:${item.id}`} className="rounded-lg border border-white/10 bg-white/[.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><strong className="text-white">{item.business}</strong><p className="mt-1 text-xs text-slate-400">{item.type} · {item.summary} · review {item.reviewAt.toISOString().slice(0, 10)}</p></div><StatusBadge status={item.status} /></div>
        <form action={reviewRetentionItem} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="type" value={item.type} /><input type="hidden" name="id" value={item.id} />
          <label className="grid gap-1 text-xs font-bold text-slate-300">Legal hold until<input type="date" name="until" className="admin-input h-10 rounded-lg px-3 text-sm" /></label>
          <label className="grid min-w-56 flex-1 gap-1 text-xs font-bold text-slate-300">Reason<input name="reason" className="admin-input h-10 rounded-lg px-3 text-sm" /></label>
          <AdminButton name="action" value="LEGAL_HOLD">Place legal hold</AdminButton>
          <AdminButton name="action" value="ANONYMIZE" tone="danger">Anonymize</AdminButton>
        </form>
      </article>)}{!items.length ? <p className="rounded-lg border border-dashed border-white/10 p-8 text-center text-slate-400">No records await retention review.</p> : null}</div>
    </AdminSection>
  </div>;
}
