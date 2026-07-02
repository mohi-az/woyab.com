import Link from "next/link";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

const links = [["/dashboard", "نمای کلی"], ["/dashboard/profile", "پروفایل"], ["/dashboard/favorites", "علاقه‌مندی‌ها"], ["/dashboard/addresses", "آدرس‌های من"], ["/dashboard/reviews", "نظرهای من"], ["/dashboard/security", "امنیت حساب"]];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, avatarUrl: true } });
  const displayName = user.name || "کاربر فارگو";
  const initials = displayName.trim().slice(0, 1).toUpperCase();
  return <div className="min-h-[75vh] bg-[#f8f5f1] px-4 py-8 sm:px-6"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[250px_1fr]">
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-28"><div className="flex items-center gap-3 border-b border-slate-100 px-3 pb-4">{user.avatarUrl ? <img src={user.avatarUrl} alt={displayName} className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/15" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-black text-primary">{initials}</span>}<div className="min-w-0"><p className="truncate font-black text-slate-950">{displayName}</p><p className="mt-1 truncate text-xs text-slate-500">{user.email}</p></div></div><nav className="mt-3 grid grid-cols-2 gap-1 lg:grid-cols-1">{links.map(([href, label]) => <Link key={href} href={href} className="rounded-xl px-3 py-3 text-sm font-bold text-slate-600 hover:bg-primary/5 hover:text-primary">{label}</Link>)}</nav></aside>
    <section className="min-w-0">{children}</section>
  </div></div>;
}
