import { getTranslations } from "next-intl/server";
import { AdminButton, AdminSection, AdminTable, StatusBadge, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { deleteReview, setReviewStatus, setReviewVerified } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;
const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;
const inputClassName = "admin-input h-10 min-w-0 rounded-lg px-3 text-sm outline-none focus:border-sky-400";

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

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const [params, t] = await Promise.all([searchParams, getTranslations("Admin")]);
  const page = pageNumber(first(params.page));
  const status = first(params.status);
  const q = first(params.q)?.trim();
  const where = {
    ...(statuses.includes(status as (typeof statuses)[number]) && { status: status as (typeof statuses)[number] }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { comment: { contains: q, mode: "insensitive" as const } },
        { business: { businessName: { contains: q, mode: "insensitive" as const } } },
        { user: { email: { contains: q, mode: "insensitive" as const } } },
      ],
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
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">{t("reviews.title")}</h1>
        <p className="mt-2 text-slate-400">{t("reviews.description")}</p>
      </div>

      <AdminSection title={t("filters.title")}>
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" method="get">
          <input name="q" defaultValue={q} placeholder={t("filters.search")} className="admin-input h-11 rounded-lg px-4 outline-none focus:border-sky-400" />
          <select name="status" defaultValue={status ?? ""} className="admin-input h-11 rounded-lg px-4 outline-none focus:border-sky-400">
            <option value="">{t("filters.allStatuses")}</option>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <AdminButton>{t("actions.filter")}</AdminButton>
        </form>
      </AdminSection>

      <AdminSection title={t("reviews.list")} description={t("pagination.summary", { total, page, totalPages })}>
        <AdminTable>
          <table className={tableClassName}>
            <thead>
              <tr>
                <th className={thClassName}>{t("fields.review")}</th>
                <th className={thClassName}>{t("fields.business")}</th>
                <th className={thClassName}>{t("fields.author")}</th>
                <th className={thClassName}>{t("fields.status")}</th>
                <th className={thClassName}>{t("fields.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {reviews.map((review) => (
                <tr key={review.id} id={review.id}>
                  <td className={tdClassName}>
                    <div className="text-amber-300">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
                    {review.title ? <p className="mt-2 font-black text-white">{review.title}</p> : null}
                    <p className="mt-2 max-w-xl whitespace-pre-line text-sm leading-6 text-slate-400">{review.comment || "-"}</p>
                    {review.verified ? <span className="mt-3 inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-100">{t("fields.verified")}</span> : null}
                  </td>
                  <td className={tdClassName}>{review.business.businessName}</td>
                  <td className={tdClassName}>{review.user.name || review.user.email || "-"}</td>
                  <td className={tdClassName}><StatusBadge status={review.status} /></td>
                  <td className={tdClassName}>
                    <div className="grid min-w-[190px] gap-2">
                      <form action={setReviewStatus} className="grid gap-2">
                        <input type="hidden" name="reviewId" value={review.id} />
                        <select name="status" defaultValue={review.status} className={inputClassName}>
                          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <AdminButton tone="success">{t("actions.apply")}</AdminButton>
                      </form>
                      <form action={setReviewVerified}>
                        <input type="hidden" name="reviewId" value={review.id} />
                        <input type="hidden" name="verified" value={String(!review.verified)} />
                        <AdminButton>{review.verified ? t("actions.unverify") : t("actions.verify")}</AdminButton>
                      </form>
                      <form action={deleteReview}>
                        <input type="hidden" name="reviewId" value={review.id} />
                        <AdminButton tone="danger">{t("actions.delete")}</AdminButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      </AdminSection>
    </div>
  );
}
