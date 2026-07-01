import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { RemoveFavoriteButton } from "@/components/dashboard/FavoriteActions";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export default async function FavoritesPage() {
  const userId = await requireUserId();
  const favorites = await prisma.favorite.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { business: { select: { id: true, slug: true, businessName: true, shortDescription: true, coverImageUrl: true } } } });
  return <><h1 className="mb-6 text-2xl font-black">علاقه‌مندی‌های من</h1><div className="grid gap-4 sm:grid-cols-2">{favorites.map(({ business }) => <article key={business.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{business.coverImageUrl ? <img src={business.coverImageUrl} alt="" className="h-36 w-full object-cover" /> : null}<div className="p-5"><h2 className="font-black">{business.businessName}</h2><p className="mt-2 line-clamp-2 text-sm text-slate-500">{business.shortDescription}</p><div className="mt-4 flex items-center justify-between"><Link href={`/businesses/${business.slug}`} className="text-sm font-bold text-primary">مشاهده کسب‌وکار</Link><RemoveFavoriteButton businessId={business.id} /></div></div></article>)}{!favorites.length ? <p className="col-span-full rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500">لیست علاقه‌مندی شما خالی است.</p> : null}</div></>;
}
