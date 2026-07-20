import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth-user";
import { archiveOwnerContactMessage, openOwnerContactMessage } from "@/lib/owner-actions";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Messages | Business Portal | Fargo" };

const inboxStatuses = ["NEW", "READ", "ARCHIVED"] as const;
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BusinessPortalMessagesPage({ searchParams }: Props) {
  const [userId, params, t, locale] = await Promise.all([
    requireUserId(),
    searchParams,
    getTranslations("Dashboard.ownerMessages"),
    getLocale(),
  ]);
  const businessId = typeof params.businessId === "string" ? params.businessId : "";
  const rawStatus = typeof params.status === "string" ? params.status : "";
  const status = inboxStatuses.includes(rawStatus as (typeof inboxStatuses)[number])
    ? (rawStatus as (typeof inboxStatuses)[number])
    : undefined;
  const messageId = typeof params.messageId === "string" ? params.messageId : "";
  const businesses = await prisma.business.findMany({
    where: { ownerId: userId },
    select: { id: true, businessName: true },
    orderBy: { businessName: "asc" },
  });
  const messages = await prisma.contactMessage.findMany({
    where: {
      business: { ownerId: userId },
      ...(businessId && { businessId }),
      ...(status && { status }),
    },
    include: { business: { select: { businessName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const selected = messageId
    ? (messages.find((m) => m.id === messageId) ??
        (await prisma.contactMessage.findFirst({
          where: { id: messageId, business: { ownerId: userId } },
          include: { business: { select: { businessName: true } } },
        })))
    : null;
  const date = (value: Date) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-950">{t("title")}</h1>
        <p className="mt-2 text-slate-500">{t("description")}</p>
      </div>
      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
        <select name="businessId" defaultValue={businessId} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary">
          <option value="">{t("allBusinesses")}</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.businessName}</option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary">
          <option value="">{t("allStatuses")}</option>
          {inboxStatuses.map((item) => (
            <option key={item} value={item}>{t(`statuses.${item}`)}</option>
          ))}
        </select>
        <button className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">{t("filter")}</button>
      </form>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.9fr)]">
        <div className="space-y-3">
          {messages.map((message) => (
            <article key={message.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="text-slate-950">{message.name}</strong>
                  <p className="mt-1 text-sm text-slate-500">
                    {message.business.businessName} · {date(message.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                  {t(`statuses.${message.status}`)}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 whitespace-pre-line text-sm leading-6 text-slate-600">{message.message}</p>
              <form action={openOwnerContactMessage} className="mt-4">
                <input type="hidden" name="id" value={message.id} />
                <button className="font-bold text-primary">{t("open")}</button>
              </form>
            </article>
          ))}
          {!messages.length ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              {t("empty")}
            </p>
          ) : null}
        </div>
        {selected ? (
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-28">
            <h2 className="text-xl font-black text-slate-950">{selected.business.businessName}</h2>
            <p className="mt-1 text-sm text-slate-500">{date(selected.createdAt)}</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div>
                <dt className="font-bold text-slate-500">{t("from")}</dt>
                <dd className="mt-1 text-slate-900">{selected.name}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">{t("contact")}</dt>
                <dd className="mt-1">
                  <a className="text-primary" href={`mailto:${selected.email}`}>{selected.email}</a>
                  {selected.phone ? ` · ${selected.phone}` : ""}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">{t("emailDelivery")}</dt>
                <dd className="mt-1">{t(`emailStatuses.${selected.emailStatus}`)}</dd>
              </div>
            </dl>
            <p className="mt-5 whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
              {selected.message}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.business.businessName}`)}`}
                className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
              >
                {t("reply")}
              </a>
              {selected.status !== "ARCHIVED" ? (
                <form action={archiveOwnerContactMessage}>
                  <input type="hidden" name="id" value={selected.id} />
                  <button className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold">{t("archive")}</button>
                </form>
              ) : null}
              <Link href="/business-portal/messages" className="px-3 py-3 text-sm font-bold text-slate-500">
                {t("close")}
              </Link>
            </div>
          </aside>
        ) : (
          <aside className="h-fit rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            {t("selectMessage")}
          </aside>
        )}
      </div>
    </div>
  );
}
