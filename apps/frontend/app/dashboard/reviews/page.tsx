import { getLocale, getTranslations } from "next-intl/server";
import { ReviewManagementCard } from "@/components/dashboard/ReviewManagementCard";
import { isAppLocale } from "@/i18n/config";
import { requireUserId } from "@/lib/auth-user";
import { localizeBusinessContent } from "@/lib/business-localization";
import { prisma } from "@/lib/prisma";

export default async function ReviewsPage() {
  const [userId, requestedLocale, t] = await Promise.all([
    requireUserId(),
    getLocale(),
    getTranslations("Dashboard.reviews"),
  ]);
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
            <ReviewManagementCard
              key={review.id}
              review={{
                id: review.id,
                rating: review.rating,
                title: review.title,
                comment: review.comment,
                status: review.status,
                businessName: localized.businessName,
                businessSlug: review.business.slug,
              }}
            />
          );
        })}
        {!reviews.length ? (
          <p className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500">{t("empty")}</p>
        ) : null}
      </div>
    </>
  );
}
