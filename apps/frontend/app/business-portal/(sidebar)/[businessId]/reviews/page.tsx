import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { upsertReviewOwnerReply } from "@/lib/owner-actions";
import type { Metadata } from "next";

type Props = { params: Promise<{ businessId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { businessId } = await params;
  const b = await prisma.business.findFirst({ where: { id: businessId }, select: { businessName: true } });
  return { title: `Reviews — ${b?.businessName ?? "Business"} | Business Portal | WoYab` };
}

function Stars({ rating }: { rating: number }) {
  return <span className="text-amber-500">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(value);
}

export default async function BusinessReviewsPage({ params }: Props) {
  const [{ businessId }, userId] = await Promise.all([params, requireUserId()]);

  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId: userId },
    select: { id: true, businessName: true, slug: true },
  });

  if (!business) notFound();

  const reviews = await prisma.review.findMany({
    where: { businessId, status: { not: "REJECTED" } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true, avatarUrl: true } },
      ownerReply: true,
    },
  });

  const inputClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Reviews</h1>
          <p className="mt-2 text-slate-500">{business.businessName} — reply as the verified owner</p>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="font-black text-slate-950">{review.title || "Customer review"}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {review.user?.name || review.user?.email || "Anonymous"} · {formatDate(review.createdAt)} · <Stars rating={review.rating} />
                </p>
              </div>
              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                {review.status}
              </span>
            </div>
            {review.comment ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{review.comment}</p>
            ) : null}

            <form action={upsertReviewOwnerReply} className="mt-4 grid gap-3">
              <input type="hidden" name="reviewId" value={review.id} />
              {review.ownerReply ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-slate-700">
                  <p className="mb-1 text-xs font-black text-emerald-700">Your reply</p>
                  <p className="whitespace-pre-line">{review.ownerReply.content}</p>
                </div>
              ) : null}
              <textarea
                name="content"
                defaultValue={review.ownerReply?.content ?? ""}
                rows={3}
                className={inputClass}
                placeholder="Write your public reply. Leave empty and save to remove the current reply."
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-400">
                  {review.ownerReply
                    ? `Last updated ${formatDate(review.ownerReply.updatedAt)}`
                    : "No owner reply yet"}
                </p>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white"
                >
                  Save reply
                </button>
              </div>
            </form>
          </article>
        ))}
        {!reviews.length ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500">
            No reviews found for this business.
          </p>
        ) : null}
      </div>
    </div>
  );
}
