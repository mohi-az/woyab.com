import { FiBarChart2, FiBriefcase, FiEye, FiMessageSquare, FiPlus } from "react-icons/fi";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BusinessAttributeFields } from "@/components/business/BusinessAttributeFields";
import { BusinessTagFields } from "@/components/business/BusinessTagFields";
import { BusinessHoursEditor } from "@/components/dashboard/BusinessHoursEditor";
import { requireUserId } from "@/lib/auth-user";
import { businessAttributeDefinitionSelect, businessAttributeValueSelect } from "@/lib/business-attributes";
import { businessTagOptionSelect, businessTagValueSelect } from "@/lib/business-tags";
import { prisma } from "@/lib/prisma";
import { updateOwnerBusinessAttributes, updateOwnerBusinessHours, updateOwnerBusinessTags, upsertReviewOwnerReply } from "@/lib/owner-actions";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(value);
}

function Stars({ rating }: { rating: number }) {
  return <span className="text-amber-500">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>;
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof FiEye; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-black text-slate-500">{label}</p>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon />
        </span>
      </div>
      <p className="mt-4 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function localizedFeatureText(locale: string) {
  if (locale === "fa") return { title: "امکانات", save: "ذخیره امکانات" };
  if (locale === "de") return { title: "Ausstattung", save: "Ausstattung speichern" };
  return { title: "Amenities and features", save: "Save features" };
}

function localizedTagText(locale: string) {
  if (locale === "fa") return { title: "برچسب‌ها", save: "ذخیره برچسب‌ها" };
  if (locale === "de") return { title: "Tags", save: "Tags speichern" };
  return { title: "Tags", save: "Save tags" };
}

export default async function OwnerDashboardPage({ searchParams }: PageProps) {
  const [userId, params, tHours, locale] = await Promise.all([requireUserId(), searchParams, getTranslations("BusinessHours"), getLocale()]);
  const featureText = localizedFeatureText(locale);
  const tagText = localizedTagText(locale);
  const [businesses, attributeDefinitions, tagOptions] = await Promise.all([
    prisma.business.findMany({
      where: { ownerId: userId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        businessName: true,
        status: true,
        reviewCount: true,
        businessHours: {
          orderBy: { dayOfWeek: "asc" },
          select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true, note: true },
        },
        attributes: {
          select: businessAttributeValueSelect,
        },
        tags: {
          select: businessTagValueSelect,
        },
      },
    }),
    prisma.attributeDefinition.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
      select: businessAttributeDefinitionSelect,
    }),
    prisma.tag.findMany({
      orderBy: [{ nameEn: "asc" }, { nameFa: "asc" }],
      select: businessTagOptionSelect,
    }),
  ]);

  const requestedBusinessId = first(params.businessId);
  const ownedIds = businesses.map((business) => business.id);
  const selectedBusinessId = businesses.length === 1
    ? businesses[0]?.id
    : requestedBusinessId && ownedIds.includes(requestedBusinessId)
      ? requestedBusinessId
      : "all";
  const selectedIds = selectedBusinessId === "all" ? ownedIds : selectedBusinessId ? [selectedBusinessId] : [];
  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId);
  const year = 2026;
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const nextYearStart = new Date(Date.UTC(year + 1, 0, 1));

  const [viewRows, totalReviews, reviews] = selectedIds.length
    ? await Promise.all([
        prisma.businessViewDaily.findMany({
          where: { businessId: { in: selectedIds }, day: { gte: yearStart, lt: nextYearStart } },
          select: { day: true, views: true },
        }),
        prisma.review.count({ where: { businessId: { in: selectedIds } } }),
        prisma.review.findMany({
          where: { businessId: { in: selectedIds } },
          orderBy: { createdAt: "desc" },
          take: 30,
          include: {
            business: { select: { businessName: true, slug: true } },
            user: { select: { name: true, email: true, avatarUrl: true } },
            ownerReply: true,
          },
        }),
      ])
    : [[], 0, []] as const;

  const monthlyViews = Array.from({ length: 12 }, () => 0);
  for (const row of viewRows) monthlyViews[row.day.getUTCMonth()] += row.views;
  const totalViews = monthlyViews.reduce((sum, value) => sum + value, 0);
  const maxMonth = Math.max(1, ...monthlyViews);

  if (!businesses.length) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-2xl text-primary">
          <FiBriefcase />
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-950">Owner dashboard</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
          You do not have a business attached to your account yet. Add your first listing to unlock owner tools, reviews and visitor analytics.
        </p>
        <Link href="/dashboard/owner/new" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white">
          <FiPlus /> Add business
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,.16)] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-primary-light">Business owner</p>
          <h1 className="mt-3 text-3xl font-black">Owner dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Manage your listings, watch visitor activity and reply to customer reviews from one workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/owner/analytics" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 text-sm font-black text-white">
            <FiBarChart2 /> Visitor analytics
          </Link>
          <form>
            <select name="businessId" defaultValue={selectedBusinessId} className="min-h-12 rounded-2xl border border-white/10 bg-white px-4 text-sm font-black text-slate-900" onChange={(event) => event.currentTarget.form?.requestSubmit()}>
              {businesses.length > 1 ? <option value="all">All businesses</option> : null}
              {businesses.map((business) => <option key={business.id} value={business.id}>{business.businessName}</option>)}
            </select>
          </form>
          <Link href="/dashboard/owner/new" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white">
            <FiPlus /> Add business
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={FiBriefcase} label="Businesses" value={selectedBusinessId === "all" ? businesses.length : selectedBusiness?.businessName ?? "-"} />
        <MetricCard icon={FiEye} label="Visitors" value={totalViews} />
        <MetricCard icon={FiMessageSquare} label="Reviews" value={totalReviews} />
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">Your businesses</h2>
            <p className="mt-1 text-sm text-slate-500">Open the public page or narrow the dashboard to one listing.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {businesses.map((business) => (
            <div key={business.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="font-black text-slate-950">{business.businessName}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">{business.status} · {business.reviewCount} reviews</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/owner?businessId=${business.id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">Dashboard</Link>
                <Link href={`/businesses/${business.slug}`} className="rounded-xl bg-primary px-3 py-2 text-xs font-black text-white">Public page</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedBusiness ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <form action={updateOwnerBusinessAttributes}>
            <input type="hidden" name="businessId" value={selectedBusiness.id} />
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">{featureText.title}</h2>
              </div>
              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white">
                {featureText.save}
              </button>
            </div>
            <div className="mt-5">
              <BusinessAttributeFields definitions={attributeDefinitions} values={selectedBusiness.attributes} />
            </div>
          </form>
        </section>
      ) : null}

      {selectedBusiness ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <form action={updateOwnerBusinessTags}>
            <input type="hidden" name="businessId" value={selectedBusiness.id} />
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">{tagText.title}</h2>
              </div>
              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white">
                {tagText.save}
              </button>
            </div>
            <div className="mt-5">
              <BusinessTagFields tags={tagOptions} values={selectedBusiness.tags} />
            </div>
          </form>
        </section>
      ) : null}

      {selectedBusiness ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <form action={updateOwnerBusinessHours}>
            <input type="hidden" name="businessId" value={selectedBusiness.id} />
            <BusinessHoursEditor defaultHours={selectedBusiness.businessHours} />
            <div className="mt-5 flex justify-end border-t border-slate-100 pt-5">
              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white">
                {tHours("save")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-primary"><FiBarChart2 /></span>
          <div>
            <h2 className="text-xl font-black text-slate-950">Month wise visitors ({year})</h2>
            <p className="mt-1 text-sm text-slate-500">Based on public business page views.</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-6 items-end gap-3 md:grid-cols-12">
          {monthlyViews.map((value, index) => (
            <div key={months[index]} className="grid gap-2 text-center">
              <div className="flex h-44 items-end rounded-xl bg-slate-50 p-1">
                <div className="w-full rounded-lg bg-primary transition-all" style={{ height: `${Math.max(6, (value / maxMonth) * 100)}%` }} />
              </div>
              <span className="text-xs font-black text-slate-500">{months[index]}</span>
              <span className="text-xs font-bold text-slate-400">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">Reviews and replies</h2>
            <p className="mt-1 text-sm text-slate-500">Reply as the verified owner of the selected business.</p>
          </div>
          {selectedBusiness && <Link href={`/businesses/${selectedBusiness.slug}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-primary">View public page</Link>}
        </div>

        <div className="mt-5 space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{review.business.businessName}</p>
                  <h3 className="mt-2 font-black text-slate-950">{review.title || "Customer review"}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {review.user.name || review.user.email || "Fargo user"} · {formatDate(review.createdAt)} · <Stars rating={review.rating} />
                  </p>
                </div>
                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">{review.status}</span>
              </div>
              {review.comment ? <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{review.comment}</p> : null}

              <form action={upsertReviewOwnerReply} className="mt-4 grid gap-3">
                <input type="hidden" name="reviewId" value={review.id} />
                <textarea
                  name="content"
                  defaultValue={review.ownerReply?.content ?? ""}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="Write your public reply. Leave empty and save to remove the current reply."
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-bold text-slate-400">
                    {review.ownerReply ? `Last updated ${formatDate(review.ownerReply.updatedAt)}` : "No owner reply yet"}
                  </p>
                  <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white">
                    Save reply
                  </button>
                </div>
              </form>
            </article>
          ))}
          {!reviews.length ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500">No reviews found for this selection.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
