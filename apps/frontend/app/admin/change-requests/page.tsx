import { AdminButton, AdminSection, StatusBadge } from "@/components/admin/AdminPrimitives";
import { reviewBusinessChangeRequest } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

export default async function AdminChangeRequestsPage() {
  const requests = await prisma.businessChangeRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      business: { select: { businessName: true, slug: true, updatedAt: true } },
      submitter: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
  });

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-black text-white">Business change requests</h1><p className="mt-2 text-slate-400">Review structured owner, employee and customer suggestions before publication.</p></div>
    <AdminSection title="Moderation queue">
      <div className="grid gap-4">
        {requests.map((request) => {
          const stale = request.business.updatedAt.getTime() !== request.businessUpdatedAt.getTime();
          const preview = changePreview(request.snapshot, request.kind, request.payload);
          return <article key={request.id} className="rounded-lg border border-white/10 bg-white/[.03] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="font-black text-white">{request.business.businessName}</h2><p className="mt-1 text-xs text-slate-400">{request.kind} · {request.submitterRelation} · {request.submitter?.name || request.submitter?.email || "Anonymized"}</p></div>
              <div className="flex items-center gap-2"><StatusBadge status={request.status} />{stale && request.status === "PENDING" ? <span className="rounded-full bg-amber-400/15 px-2 py-1 text-xs font-black text-amber-300">STALE</span> : null}</div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <JsonPanel title="Before (captured snapshot)" value={preview.before} />
              <JsonPanel title="After (requested result)" value={preview.after} />
            </div>
            {request.additionalContext ? <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{request.additionalContext}</p> : null}
            {request.evidenceUrl ? <a className="mt-2 block text-sm font-bold text-sky-300" href={request.evidenceUrl} target="_blank" rel="noreferrer">Open supporting link</a> : null}
            {request.status === "PENDING" ? <form action={reviewBusinessChangeRequest} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={request.id} />
              <label className="grid min-w-64 flex-1 gap-2 text-xs font-bold text-slate-300">Decision reason<textarea name="decisionReason" required minLength={3} className="admin-input min-h-20 rounded-lg px-3 py-2 text-sm" /></label>
              <AdminButton name="decision" value="APPROVE" tone="success">Approve and apply</AdminButton>
              <AdminButton name="decision" value="REJECT" tone="danger">Reject</AdminButton>
            </form> : <p className="mt-4 text-sm text-slate-400">{request.decisionReason || "No decision reason recorded."}</p>}
          </article>;
        })}
        {!requests.length ? <p className="rounded-lg border border-dashed border-white/10 p-8 text-center text-slate-400">No change requests yet.</p> : null}
      </div>
    </AdminSection>
  </div>;
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return <section className="min-w-0 rounded-lg border border-white/8 bg-slate-950/30 p-3"><h3 className="text-xs font-black uppercase tracking-wide text-slate-400">{title}</h3><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-300">{JSON.stringify(value, null, 2)}</pre></section>;
}

function changePreview(snapshot: unknown, kind: string, payload: unknown) {
  const before = JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
  const after = JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
  const input = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};

  if (kind === "DETAILS" && Array.isArray(input.changes)) {
    for (const change of input.changes) {
      if (change && typeof change === "object" && "field" in change && "value" in change && typeof change.field === "string") after[change.field] = change.value;
    }
    if (Array.isArray(input.translations)) after.translations = input.translations;
  } else if (kind === "HOURS") after.businessHours = input.hours;
  else if (kind === "ATTRIBUTES") after.attributes = input.attributes;
  else if (kind === "TAGS") after.tags = Array.isArray(input.tagIds) ? input.tagIds.map((tagId) => ({ tagId })) : [];
  else if (kind === "SERVICE_CREATE") after.services = [...(Array.isArray(after.services) ? after.services : []), { ...input, id: "(new)" }];
  else if (kind === "SERVICE_UPDATE" && Array.isArray(after.services)) after.services = after.services.map((service) => service && typeof service === "object" && "id" in service && service.id === input.serviceId ? { ...service, ...input } : service);
  else if (kind === "SERVICE_DEACTIVATE" && Array.isArray(after.services)) after.services = after.services.map((service) => service && typeof service === "object" && "id" in service && service.id === input.serviceId ? { ...service, active: false } : service);

  return { before, after };
}
