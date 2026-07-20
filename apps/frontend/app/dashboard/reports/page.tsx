import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

const style = {
  OPEN: "bg-amber-50 text-amber-800",
  REVIEWING: "bg-sky-50 text-sky-800",
  RESOLVED: "bg-emerald-50 text-emerald-800",
  DISMISSED: "bg-slate-100 text-slate-700",
} as const;

export default async function UserReportsPage() {
  const userId = await requireUserId();
  const reports = await prisma.directoryReport.findMany({
    where: { reporterUserId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reason: true,
      status: true,
      decisionReason: true,
      actionTaken: true,
      createdAt: true,
      resolvedAt: true,
      business: { select: { businessName: true } },
      review: { select: { business: { select: { businessName: true } } } },
    },
  });
  return (
    <div>
      <h1 className="mb-2 text-2xl font-black">My reports</h1>
      <p className="mb-6 text-sm text-slate-600">Track moderation status and final decisions for reports submitted while signed in.</p>
      <div className="space-y-3">
        {reports.map((report) => (
          <article key={report.id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black">{report.business?.businessName || report.review?.business.businessName || "Reported content"}</h2>
                <p className="mt-1 text-sm text-slate-500">{report.reason}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${style[report.status]}`}>{report.status}</span>
            </div>
            {report.decisionReason ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm"><strong>Decision:</strong> {report.decisionReason}</p> : null}
            {report.actionTaken ? <p className="mt-2 text-sm text-slate-600"><strong>Action taken:</strong> {report.actionTaken}</p> : null}
          </article>
        ))}
        {!reports.length ? <p className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500">No reports submitted from this account.</p> : null}
      </div>
    </div>
  );
}
