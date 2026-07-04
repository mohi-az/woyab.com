import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/config";
import { requireUserId } from "@/lib/auth-user";
import { localizeBusinessContent } from "@/lib/business-localization";
import { prisma } from "@/lib/prisma";

const statusStyle = { PENDING: "bg-amber-50 text-amber-700", APPROVED: "bg-emerald-50 text-emerald-700", REJECTED: "bg-red-50 text-red-700" };

export default async function ReviewsPage() {
  const [userId, requestedLocale, t] = await Promise.all([requireUserId(), getLocale(), getTranslations("Dashboard.reviews")]);
  const locale = isAppLocale(requestedLocale) ? requestedLocale : "de";
  const reviews = await prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      business: {
        select: {
          slug: true,
          sourceLocale: true,
          businessName: true,
          shortDescription: true,
          translations: {
            select: {
              locale: true,
              businessName: true,
              shortDescription: true,
              description: true,
            },
          },
        },
      },
    },
  });

  return (
    <>
      <h1 className="mb-6 text-2xl font-black">{t("title")}</h1>
      <div className="space-y-3">
        {reviews.map((review) => {
          const localized = localizeBusinessContent(review.business, locale);

          return (
            <Link key={review.id} href={`/businesses/${review.business.slug}`} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-primary/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-black">{localized.businessName}</h2>
                  <p className="mt-1 text-sm text-amber-500">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle[review.status]}`}>{t(`status.${review.status}`)}</span>
              </div>
              {review.title ? <p className="mt-3 font-bold text-slate-700">{review.title}</p> : null}
              {review.comment ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{review.comment}</p> : null}
            </Link>
          );
        })}
        {!reviews.length ? <p className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500">{t("empty")}</p> : null}
      </div>
    </>
  );
}
