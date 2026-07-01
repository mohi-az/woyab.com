import Link from "next/link";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [user, favorites, addresses, reviews] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }), prisma.favorite.count({ where: { userId } }), prisma.userSavedLocation.count({ where: { userId } }), prisma.review.count({ where: { userId } }),
  ]);
  const cards = [["علاقه‌مندی‌ها", favorites, "/dashboard/favorites"], ["آدرس‌ها", addresses, "/dashboard/addresses"], ["نظرها", reviews, "/dashboard/reviews"]] as const;
  return <div><h1 className="text-3xl font-black text-slate-950">سلام {user.name || "دوست عزیز"}</h1><p className="mt-2 text-slate-500">از اینجا اطلاعات حساب و فعالیت‌های خود را مدیریت کنید.</p><div className="mt-7 grid gap-4 sm:grid-cols-3">{cards.map(([label, count, href]) => <Link href={href} key={href} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/30"><strong className="text-3xl text-primary">{count}</strong><p className="mt-2 font-bold text-slate-700">{label}</p></Link>)}</div><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-black">تکمیل حساب</h2><p className="mt-2 text-sm leading-6 text-slate-500">نام، شماره تماس و تصویر پروفایل را کامل کنید تا تجربه شخصی‌تری داشته باشید.</p><Link href="/dashboard/profile" className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-white">ویرایش پروفایل</Link></div></div>;
}
