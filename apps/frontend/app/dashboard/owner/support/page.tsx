import { createSupportTicket, closeSupportTicket, replyToSupportTicket } from "@/lib/owner-actions";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";

const statusLabels = { OPEN: "Open", PENDING: "Waiting for you", RESOLVED: "Resolved", CLOSED: "Closed" } as const;

export default async function OwnerSupportPage({ searchParams }: { searchParams: Promise<{ ticketId?: string }> }) {
  const userId = await requireUserId();
  const [params, user, tickets] = await Promise.all([
    searchParams,
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, _count: { select: { businesses: true } } } }),
    prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { assignedTo: { select: { name: true } }, replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } } },
    }),
  ]);
  if (!user || (user.role === "USER" && user._count.businesses === 0)) throw new Error("This page is only available to business owners.");
  const selected = tickets.find((ticket) => ticket.id === params.ticketId) ?? tickets[0];

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-black text-slate-950">Support tickets</h1><p className="mt-2 text-slate-500">Talk directly with the Fargo administration and follow your requests.</p></div>
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" open={!tickets.length}>
      <summary className="cursor-pointer font-black text-primary">Create a new ticket</summary>
      <form action={createSupportTicket} className="mt-5 grid gap-4">
        <input name="subject" required minLength={3} maxLength={160} placeholder="Subject" className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary" />
        <textarea name="message" required minLength={10} maxLength={4000} rows={5} placeholder="Describe your request with enough detail…" className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary" />
        <button className="w-fit rounded-xl bg-primary px-6 py-3 font-bold text-white">Send ticket</button>
      </form>
    </details>
    <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
      <aside className="space-y-2">
        {tickets.map((ticket) => <Link key={ticket.id} href={`/dashboard/owner/support?ticketId=${ticket.id}`} className={`block rounded-xl border p-4 ${selected?.id === ticket.id ? "border-primary bg-primary/5" : "border-slate-200 bg-white"}`}>
          <strong className="block truncate text-slate-900">{ticket.subject}</strong><span className="mt-2 block text-xs font-bold text-slate-500">{statusLabels[ticket.status]} · {ticket.updatedAt.toLocaleDateString()}</span>
        </Link>)}
        {!tickets.length ? <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">You have no support tickets yet.</p> : null}
      </aside>
      {selected ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4"><div><h2 className="text-xl font-black text-slate-950">{selected.subject}</h2><p className="mt-1 text-xs text-slate-500">{statusLabels[selected.status]}{selected.assignedTo?.name ? ` · ${selected.assignedTo.name}` : ""}</p></div>
          {selected.status !== "CLOSED" ? <form action={closeSupportTicket}><input type="hidden" name="ticketId" value={selected.id} /><button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600">Close ticket</button></form> : null}
        </div>
        <div className="my-5 space-y-4">
          <article className="ml-auto max-w-[85%] rounded-2xl bg-primary/10 p-4"><p className="whitespace-pre-line text-sm leading-7 text-slate-800">{selected.message}</p><span className="mt-2 block text-xs text-slate-500">You · {selected.createdAt.toLocaleString()}</span></article>
          {selected.replies.map((reply) => { const isOwner = reply.authorId === userId; return <article key={reply.id} className={`max-w-[85%] rounded-2xl p-4 ${isOwner ? "ml-auto bg-primary/10" : "bg-slate-100"}`}><p className="whitespace-pre-line text-sm leading-7 text-slate-800">{reply.message}</p><span className="mt-2 block text-xs text-slate-500">{isOwner ? "You" : reply.author.name || "Fargo support"} · {reply.createdAt.toLocaleString()}</span></article>; })}
        </div>
        {selected.status !== "CLOSED" ? <form action={replyToSupportTicket} className="flex gap-3 border-t border-slate-100 pt-4"><input type="hidden" name="ticketId" value={selected.id} /><textarea name="message" required minLength={2} maxLength={4000} rows={3} placeholder="Write a reply…" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary" /><button className="self-end rounded-xl bg-primary px-5 py-3 font-bold text-white">Reply</button></form> : <p className="border-t border-slate-100 pt-4 text-sm text-slate-500">This ticket is closed. Create a new ticket if you need more help.</p>}
      </section> : null}
    </div>
  </div>;
}
