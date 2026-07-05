import { getTranslations } from "next-intl/server";
import { AdminReviewsTable, type AdminReviewRow } from "@/components/admin/AdminReviewsTable";
import { AdminSection } from "@/components/admin/AdminPrimitives";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;
const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function optionalRating(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const [params, t] = await Promise.all([searchParams, getTranslations("Admin")]);
  const page = pageNumber(first(params.page));
  const status = first(params.status);
  const q = first(params.q)?.trim();
  const business = first(params.business)?.trim();
  const author = first(params.author)?.trim();
  const rating = optionalRating(first(params.rating));
  const validStatus = statuses.includes(status as (typeof statuses)[number]) ? status as (typeof statuses)[number] : null;
  const where = {
    ...(validStatus && { status: validStatus }),
    ...(rating && { rating }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { comment: { contains: q, mode: "insensitive" as const } },
      ],
    }),
    ...(business && { business: { businessName: { contains: business, mode: "insensitive" as const } } }),
    ...(author && {
      user: {
        OR: [
          { name: { contains: author, mode: "insensitive" as const } },
          { email: { contains: author, mode: "insensitive" as const } },
        ],
      },
    }),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        business: { select: { businessName: true, slug: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  const reviewRows: AdminReviewRow[] = reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    status: review.status,
    verified: review.verified,
    createdAt: review.createdAt.toISOString(),
    businessName: review.business.businessName,
    businessSlug: review.business.slug,
    author: review.user.name || review.user.email || "-",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">{t("reviews.title")}</h1>
        <p className="mt-2 text-slate-400">{t("reviews.description")}</p>
      </div>

      <AdminSection title={t("reviews.list")}>
        <AdminReviewsTable
          reviews={reviewRows}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          filters={{
            q,
            business,
            author,
            status: validStatus ?? undefined,
            rating: rating ? String(rating) : undefined,
          }}
        />
      </AdminSection>
    </div>
  );
}
