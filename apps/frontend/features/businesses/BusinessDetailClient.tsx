"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiExternalLink,
  FiGlobe,
  FiMail,
  FiMapPin,
  FiMessageSquare,
  FiNavigation,
  FiPhone,
  FiSend,
  FiSliders,
  FiStar,
  FiThumbsUp,
} from "react-icons/fi";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTelegramPlane, FaYoutube } from "react-icons/fa";
import { MdStar, MdStarBorder } from "react-icons/md";
import { Link } from "@/i18n/navigation";
import { CategoryIcon } from "@/lib/business-categories";
import type { BusinessDetailData, BusinessReviewItem, CurrentUser } from "@/lib/api";
import { buildDirectionsUrl } from "@/lib/directions";
import { DirectoryReportButton } from "@/features/businesses/DirectoryReportButton";
import { BusinessEditButton } from "@/features/businesses/BusinessEditButton";
import { getCookieConsent, onCookieConsentChange } from "@/lib/cookie-consent";
import { getBusinessOpenStatus } from "@/lib/business-hours";

type Props = {
  business: BusinessDetailData;
  initialReviews: BusinessReviewItem[];
};

type ReviewFormState = {
  rating: number;
  title: string;
  comment: string;
};

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

const socialIcons = {
  instagram: FaInstagram,
  telegram: FaTelegramPlane,
  facebook: FaFacebookF,
  youtube: FaYoutube,
  linkedin: FaLinkedinIn,
} as const;

function StaticStars({ rating }: { rating: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }, (_, index) =>
        index < rounded ? <MdStar key={index} /> : <MdStarBorder key={index} className="text-amber-300" />,
      )}
    </div>
  );
}

function normalizeUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function formatReviewDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function formatAttributeValue(attribute: BusinessDetailData["attributes"][number]) {
  if (attribute.dataType === "BOOLEAN") return attribute.label;
  return `${attribute.label}: ${attribute.value}`;
}

function localizedTagTitle(locale: string) {
  if (locale === "fa") return "برچسب‌ها";
  if (locale === "de") return "Tags";
  return "Tags";
}

function ReviewAvatar({ user }: { user: BusinessReviewItem["user"] }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.name} className="h-12 w-12 rounded-2xl object-cover" />;
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary">
      {user.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function BusinessDetailClient({ business, initialReviews }: Props) {
  const t = useTranslations("BusinessDetail");
  const locale = useLocale();
  const BackIcon = locale === "fa" ? FiArrowRight : FiArrowLeft;
  const directionsHref = buildDirectionsUrl({
    address: business.address,
    city: business.location,
    latitude: business.latitude,
    longitude: business.longitude,
  });
  const categoryHref = business.categoryId ? `/businesses?categoryId=${business.categoryId}` : null;
  const cityHref = business.cityId ? `/businesses?cityId=${business.cityId}` : null;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [reviews, setReviews] = useState(() => initialReviews.filter((review) => review.status === "APPROVED"));
  const [reviewForm, setReviewForm] = useState<ReviewFormState>({ rating: 0, title: "", comment: "" });
  const [contactForm, setContactForm] = useState<ContactFormState>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [contactFeedback, setContactFeedback] = useState<string | null>(null);
  const [reviewPending, setReviewPending] = useState(false);
  const [contactPending, setContactPending] = useState(false);
  const [helpfulReviewIds, setHelpfulReviewIds] = useState<Set<string>>(new Set());
  const [helpfulPendingIds, setHelpfulPendingIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => new Date());
  const openStatus = getBusinessOpenStatus(business.hours, now);
  const openStatusLabel = openStatus.kind === "UNKNOWN"
    ? null
    : t(`openStatus.${openStatus.kind}`, { time: openStatus.transitionTime ?? "" });
  const reviewIdsKey = reviews.map((review) => review.id).join(",");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (response.ok) {
          const session = await response.json() as {
            user?: { id?: string; name?: string | null; email?: string | null; image?: string | null; invalid?: boolean };
          };
          if (!cancelled && session.user?.id && !session.user.invalid) {
            const displayName = session.user.name?.trim() || session.user.email || "User";
            const user = {
              id: session.user.id,
              name: displayName,
              email: session.user.email ?? null,
              avatarUrl: session.user.image ?? null,
            };
            setCurrentUser(user);
            setContactForm((current) => ({
              ...current,
              name: current.name || user.name,
              email: current.email || user.email || "",
            }));
            return;
          }
        }
      } catch {
        if (!cancelled) setCurrentUser(null);
      }
    }

    void loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !reviewIdsKey) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    for (const reviewId of reviewIdsKey.split(",")) params.append("id", reviewId);
    void fetch(`/api/reviews/helpful?${params}`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((json) => setHelpfulReviewIds(new Set<string>(json.data?.reviewIds ?? [])))
      .catch(() => undefined);
    return () => controller.abort();
  }, [currentUser, reviewIdsKey]);

  useEffect(() => {
    let recorded = false;

    const recordView = () => {
      if (recorded || !getCookieConsent()?.analytics) return;
      recorded = true;

      const visitorKey = "woyab_analytics_visitor";
      const sessionKey = "woyab_analytics_session";
      const sessionActivityKey = "woyab_analytics_session_activity";
      const now = Date.now();
      const newId = () => crypto.randomUUID().replaceAll("-", "");
      let visitorId = localStorage.getItem(visitorKey);
      if (!visitorId) { visitorId = newId(); localStorage.setItem(visitorKey, visitorId); }
      const lastActivity = Number(localStorage.getItem(sessionActivityKey) || 0);
      let sessionId = localStorage.getItem(sessionKey);
      if (!sessionId || now - lastActivity > 30 * 60 * 1000) { sessionId = newId(); localStorage.setItem(sessionKey, sessionId); }
      localStorage.setItem(sessionActivityKey, String(now));
      void fetch(`/api/businesses/${business.id}/views`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visitorId, sessionId }),
        keepalive: true,
      }).catch(() => undefined);
    };

    recordView();
    return onCookieConsentChange((nextConsent) => {
      if (nextConsent.analytics) recordView();
    });
  }, [business.id]);

  const activeImage = business.gallery[activeImageIndex] ?? business.gallery[0];

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || reviewPending) return;

    setReviewFeedback(null);

    if (reviewForm.rating < 1) {
      setReviewFeedback(t("reviewsForm.ratingRequired"));
      return;
    }

    if (!reviewForm.comment.trim()) {
      setReviewFeedback(t("reviewsForm.commentRequired"));
      return;
    }

    setReviewPending(true);

    try {
      const response = await fetch(`/api/businesses/${business.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewForm.rating,
          title: reviewForm.title.trim() || undefined,
          comment: reviewForm.comment.trim(),
        }),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setReviewFeedback(json?.error ?? json?.message ?? t("reviewsForm.submitError"));
        return;
      }

      setReviewForm({ rating: 0, title: "", comment: "" });
      setReviewFeedback(t("reviewsForm.submitSuccess"));
    } catch {
      setReviewFeedback(t("reviewsForm.submitError"));
    } finally {
      setReviewPending(false);
    }
  }

  async function submitContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || contactPending) return;

    setContactFeedback(null);
    setContactPending(true);

    try {
      const response = await fetch(`/api/businesses/${business.id}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        setContactFeedback(json?.error ?? t("contactForm.submitError"));
        return;
      }

      setContactForm((current) => ({ ...current, phone: "", message: "" }));
      setContactFeedback(t("contactForm.submitSuccess"));
    } catch {
      setContactFeedback(t("contactForm.submitError"));
    } finally {
      setContactPending(false);
    }
  }

  async function toggleHelpful(review: BusinessReviewItem) {
    if (!currentUser || currentUser.id === review.user.id || helpfulPendingIds.has(review.id)) return;
    const voted = helpfulReviewIds.has(review.id);
    setHelpfulPendingIds((current) => new Set(current).add(review.id));
    try {
      const response = await fetch(`/api/reviews/${review.id}/helpful`, {
        method: voted ? "DELETE" : "POST",
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) return;
      setHelpfulReviewIds((current) => {
        const next = new Set(current);
        if (json.data.voted) next.add(review.id);
        else next.delete(review.id);
        return next;
      });
      setReviews((current) => current.map((item) => item.id === review.id
        ? { ...item, helpfulCount: json.data.helpfulCount }
        : item));
    } finally {
      setHelpfulPendingIds((current) => {
        const next = new Set(current);
        next.delete(review.id);
        return next;
      });
    }
  }

  return (
    <div className="bg-[#f8f5f1] pb-16 [&_button:not(:disabled)]:cursor-pointer">
      <section className="hero-theme relative isolate -mt-16 overflow-hidden bg-slate-950 px-4 pb-12 pt-28 text-white sm:px-6 sm:pb-16 sm:pt-32 lg:-mt-[4.75rem] lg:pt-36">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(241,91,63,.26),transparent_26%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,18,31,.96)_0%,rgba(10,18,31,.83)_52%,rgba(10,18,31,.68)_100%)]" />
        <div className="relative mx-auto max-w-[1480px]">
          <Link href="/businesses" className="inline-flex items-center gap-2 text-sm font-bold text-primary-light/90 transition hover:text-white">
            <BackIcon className="text-base" />
            {t("back")}
          </Link>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                {business.categoryName ? (
                  categoryHref ? (
                    <Link
                      href={categoryHref}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 transition hover:border-primary-light/50 hover:bg-white/16 hover:text-white"
                    >
                      <CategoryIcon iconKey={business.categoryIconKey} categorySlug={business.categorySlug} className="text-primary-light" />
                      {business.categoryName}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                      <CategoryIcon iconKey={business.categoryIconKey} categorySlug={business.categorySlug} className="text-primary-light" />
                      {business.categoryName}
                    </span>
                  )
                ) : null}
                {business.location ? (
                  cityHref ? (
                    <Link
                      href={cityHref}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 transition hover:border-primary-light/50 hover:bg-white/16 hover:text-white"
                    >
                      <FiMapPin className="text-primary-light" />
                      {business.location}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                      <FiMapPin className="text-primary-light" />
                      {business.location}
                    </span>
                  )
                ) : null}
                {business.verified ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-emerald-200">
                    <FiCheckCircle />
                    {t("verified")}
                  </span>
                ) : null}
                {business.featured ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/12 px-3 py-1 text-amber-200">
                    <FiStar />
                    {t("featured")}
                  </span>
                ) : null}
                {openStatusLabel ? (
                  <span className={`inline-flex rounded-full border px-3 py-1.5 font-black ${
                    openStatus.kind === "OPEN"
                      ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-200"
                      : openStatus.kind === "CLOSE_SOON"
                        ? "border-amber-300/30 bg-amber-300/15 text-amber-200"
                        : openStatus.kind === "OPEN_SOON"
                          ? "border-sky-300/30 bg-sky-300/15 text-sky-200"
                          : "border-slate-300/20 bg-slate-300/10 text-slate-300"
                  }`}>
                    {openStatusLabel}
                  </span>
                ) : null}
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{business.title}</h1>
              {business.shortDescription ? (
                <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">{business.shortDescription}</p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-slate-200">
                <div className="flex items-center gap-3">
                  <StaticStars rating={business.rating} />
                  <span className="font-bold">{business.rating.toFixed(1)}</span>
                </div>
                <span>{t("reviewsCount", { count: business.reviewCount })}</span>
                {business.establishedYear ? (
                  <span className="inline-flex items-center gap-2">
                    <FiCalendar className="text-primary-light" />
                    {t("established", { year: business.establishedYear })}
                  </span>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {directionsHref ? (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white shadow-[0_18px_40px_-18px_rgba(241,91,63,.8)] transition hover:-translate-y-0.5 hover:bg-primary-dark"
                  >
                    <FiNavigation />
                    {t("directions")}
                  </a>
                ) : null}
                <DirectoryReportButton
                  targetType="business"
                  targetId={business.id}
                  targetLabel={business.title}
                  currentUser={currentUser}
                  variant="hero"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1480px] gap-8 px-4 pt-8 sm:px-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
        <div className="space-y-8">
          <section className="overflow-hidden rounded-[30px] bg-white shadow-[0_20px_60px_rgba(15,23,42,.08)]">
            <div className="relative aspect-[16/9] bg-slate-100">
              {activeImage ? (
                <img src={activeImage.imageUrl} alt={activeImage.caption || business.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">{business.title}</div>
              )}
            </div>

            {activeImage?.sourceUri || activeImage?.authorAttributions?.length ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                <span>
                  {activeImage.authorAttributions?.map((author, index) => (
                    <span key={`${author.displayName}-${index}`}>
                      {author.uri ? <a href={author.uri} target="_blank" rel="noreferrer" className="font-bold hover:text-primary">{author.displayName}</a> : author.displayName}
                      {index < (activeImage.authorAttributions?.length ?? 0) - 1 ? ", " : ""}
                    </span>
                  ))}
                </span>
                {activeImage.sourceUri ? <a href={activeImage.sourceUri} target="_blank" rel="noreferrer" className="font-black text-primary hover:underline">Google Maps</a> : null}
              </div>
            ) : null}

            {business.gallery.length > 1 ? (
              <div className="grid grid-cols-4 gap-3 p-4 sm:grid-cols-6">
                {business.gallery.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`overflow-hidden rounded-2xl border-2 transition ${
                      index === activeImageIndex ? "border-primary shadow-lg" : "border-transparent hover:border-primary/35"
                    }`}
                  >
                    <img src={image.imageUrl} alt={image.caption || business.title} className="aspect-square h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-[24px] bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,.05)] sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t("stats.rating")}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{business.rating.toFixed(1)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t("stats.reviews")}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{reviews.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t("stats.category")}</p>
                {business.categoryName ? (
                  categoryHref ? (
                    <Link href={categoryHref} className="mt-2 inline-flex text-base font-black text-slate-950 transition hover:text-primary">
                      {business.categoryName}
                    </Link>
                  ) : (
                    <p className="mt-2 text-base font-black text-slate-950">{business.categoryName}</p>
                  )
                ) : (
                  <p className="mt-2 text-base font-black text-slate-950">-</p>
                )}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t("stats.specialty")}</p>
                <p className="mt-2 text-base font-black text-slate-950">{business.subCategoryName ?? business.specialtyName ?? "-"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.06)] sm:p-8">
            <h2 className="text-2xl font-black text-slate-950">{t("overviewTitle")}</h2>
            {business.description ? (
              <p className="mt-5 whitespace-pre-line text-base leading-8 text-slate-600">{business.description}</p>
            ) : (
              <p className="mt-5 text-base leading-8 text-slate-500">{t("descriptionFallback")}</p>
            )}

            {business.tags.length ? (
              <div className="mt-8">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{localizedTagTitle(locale)}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {business.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section id="reviews" className="rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.06)] sm:p-8">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">{t("reviewsSection.eyebrow")}</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{t("reviewsSection.title")}</h2>
              </div>
              <div className="rounded-2xl bg-[#fff7f4] px-4 py-3 text-sm font-bold text-slate-700">
                {t("reviewsCount", { count: reviews.length })}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {reviews.length ? reviews.map((review) => (
                <article key={review.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex items-start gap-4">
                    <ReviewAvatar user={review.user} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-base font-black text-slate-950">{review.user.name}</h3>
                          <p className="text-sm text-slate-500">{formatReviewDate(review.createdAt, locale)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <StaticStars rating={review.rating} />
                          <DirectoryReportButton
                            targetType="review"
                            targetId={review.id}
                            targetLabel={review.title || review.comment || review.user.name}
                            currentUser={currentUser}
                          />
                        </div>
                      </div>

                      {review.title ? <p className="mt-4 text-sm font-black text-slate-900">{review.title}</p> : null}
                      {review.comment ? <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{review.comment}</p> : null}
                      <button
                        type="button"
                        disabled={!currentUser || currentUser.id === review.user.id || helpfulPendingIds.has(review.id)}
                        onClick={() => void toggleHelpful(review)}
                        aria-pressed={helpfulReviewIds.has(review.id)}
                        title={!currentUser
                          ? t("reviewsSection.helpfulLogin")
                          : currentUser.id === review.user.id
                            ? t("reviewsSection.helpfulOwn")
                            : undefined}
                        className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          helpfulReviewIds.has(review.id)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"
                        }`}
                      >
                        <FiThumbsUp />
                        {t("reviewsSection.helpful", { count: review.helpfulCount })}
                      </button>
                      {review.ownerReply ? (
                        <div className="mt-4 rounded-2xl border border-primary/10 bg-white px-4 py-3">
                          <div className="flex items-center gap-2 text-xs font-black text-primary">
                            <FiMessageSquare />
                            <span>{t("reviewsSection.ownerReply")}</span>
                          </div>
                          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{review.ownerReply.content}</p>
                          <p className="mt-2 text-xs font-bold text-slate-400">{review.ownerReply.ownerName}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              )) : (
                <div className="rounded-3xl border border-dashed border-slate-200 px-5 py-8 text-center text-slate-500">
                  {t("reviewsSection.empty")}
                </div>
              )}
            </div>

            <div className="mt-8 rounded-[28px] border border-slate-100 bg-[#fcfbfa] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <FiMessageSquare className="text-xl text-primary" />
                <h3 className="text-xl font-black text-slate-950">{t("reviewsForm.title")}</h3>
              </div>

              {currentUser ? (
                <form className="mt-5 space-y-4" onSubmit={submitReview}>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">{t("reviewsForm.ratingLabel")}</label>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, index) => {
                        const value = index + 1;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setReviewForm((current) => ({ ...current, rating: value }))}
                            className="inline-flex h-8 w-8 items-center justify-center text-amber-400 transition hover:scale-110 sm:h-9 sm:w-9"
                            aria-label={t("reviewsForm.chooseStars", { count: value })}
                          >
                            {value <= reviewForm.rating ? (
                              <MdStar className="h-7 w-7 text-amber-400 drop-shadow-[0_4px_10px_rgba(251,191,36,.28)] sm:h-8 sm:w-8" />
                            ) : (
                              <MdStarBorder className="h-7 w-7 text-amber-300 sm:h-8 sm:w-8" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      value={reviewForm.title}
                      onChange={(event) => setReviewForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder={t("reviewsForm.titlePlaceholder")}
                      className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-primary sm:col-span-2"
                    />
                  </div>

                  <textarea
                    value={reviewForm.comment}
                    onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                    placeholder={t("reviewsForm.commentPlaceholder")}
                    rows={5}
                    className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary"
                  />

                  {reviewFeedback ? <p className="text-sm font-medium text-slate-600">{reviewFeedback}</p> : null}

                  <button
                    type="submit"
                    disabled={reviewPending}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-black !text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {reviewPending ? t("reviewsForm.submitting") : t("reviewsForm.submit")}
                  </button>
                </form>
              ) : (
                <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3 rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm leading-7 text-slate-600">
                  <span>{t("reviewsForm.loginRequired")}</span>
                  <Link href="/login" className="font-black text-primary transition hover:text-primary-dark">
                    {t("reviewsForm.loginAction")}
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="order-1 rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.06)]">
            <h2 className={`text-2xl font-black text-slate-950 ${locale === "fa" ? "text-right" : ""}`}>{t("contactCard.title")}</h2>

            <div dir={locale === "fa" ? "ltr" : undefined} className={`mt-6 space-y-4 text-sm text-slate-600 ${locale === "fa" ? "text-left" : ""}`}>
              {business.address ? (
                <p className="flex items-start gap-3">
                  <FiMapPin className="mt-0.5 shrink-0 text-primary" />
                  <span dir="auto">{business.address}</span>
                </p>
              ) : null}
              {business.phone ? (
                <p className="flex items-center gap-3">
                  <FiPhone className="shrink-0 text-primary" />
                  <span dir="ltr">{business.phone}</span>
                </p>
              ) : null}
              {business.email ? (
                <p className="flex items-center gap-3">
                  <FiMail className="shrink-0 text-primary" />
                  <span dir="ltr">{business.email}</span>
                </p>
              ) : null}
              {business.website ? (
                <a
                  href={normalizeUrl(business.website)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 font-bold text-primary transition hover:text-primary-dark"
                >
                  <FiGlobe className="shrink-0" />
                  <span dir={locale === "fa" ? "rtl" : undefined}>{t("contactCard.website")}</span>
                  <FiExternalLink />
                </a>
              ) : null}
            </div>

            {business.socialLinks.length ? (
              <div dir={locale === "fa" ? "ltr" : undefined} className="mt-6 flex flex-wrap gap-3">
                {business.socialLinks.map((item) => {
                  const Icon = socialIcons[item.key];
                  return (
                    <a
                      key={item.key}
                      href={normalizeUrl(item.url)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={item.key}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-primary hover:text-white"
                    >
                      <Icon />
                    </a>
                  );
                })}
              </div>
            ) : null}

            <BusinessEditButton business={business} currentUser={currentUser} />
          </section>

          {business.hasOwner ? (
            <section className="order-5 rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.06)]">
              <h2 className="text-2xl font-black text-slate-950">{t("contactForm.title")}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">{t("contactForm.description")}</p>

              {currentUser ? (
                <form className="mt-5 space-y-4" onSubmit={submitContact}>
                  <input
                    value={contactForm.name}
                    onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder={t("contactForm.namePlaceholder")}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-primary"
                  />
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder={t("contactForm.emailPlaceholder")}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-primary"
                  />
                  <input
                    value={contactForm.phone}
                    onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder={t("contactForm.phonePlaceholder")}
                    className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-primary"
                  />
                  <textarea
                    value={contactForm.message}
                    onChange={(event) => setContactForm((current) => ({ ...current, message: event.target.value }))}
                    placeholder={t("contactForm.messagePlaceholder")}
                    rows={6}
                    className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary"
                  />

                  {contactFeedback ? <p className="text-sm font-medium text-slate-600">{contactFeedback}</p> : null}

                  <button
                    type="submit"
                    disabled={contactPending}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-black !text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 [&_*]:!text-white"
                  >
                    <FiSend />
                    {contactPending ? t("contactForm.sending") : t("contactForm.submit")}
                  </button>
                </form>
              ) : (
                <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3 rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm leading-7 text-slate-600">
                  <span>{t("reviewsForm.loginRequired")}</span>
                  <Link href="/login" className="font-black text-primary transition hover:text-primary-dark">
                    {t("reviewsForm.loginAction")}
                  </Link>
                </div>
              )}
            </section>
          ) : null}

          {business.attributes.length ? (
            <section className="order-2 rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.06)]">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FiSliders className="text-lg" />
                </span>
                <h2 className="leading-none text-2xl font-black text-slate-950">{locale === "fa" ? "امکانات" : locale === "de" ? "Ausstattung" : "Amenities"}</h2>
              </div>

              <div className="mt-5 grid gap-3">
                {business.attributes.map((attribute) => (
                  <div key={attribute.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                    <FiCheckCircle className="shrink-0 text-primary" />
                    <span>{formatAttributeValue(attribute)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {business.services.length ? (
            <section className="order-3 rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.06)]">
              <h2 className="text-2xl font-black text-slate-950">{locale === "fa" ? "خدمات و منو" : locale === "de" ? "Leistungen und Angebot" : "Services and menu"}</h2>
              <div className="mt-5 grid gap-3">
                {business.services.map((service) => <article key={service.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4"><h3 className="font-black text-slate-900">{service.title}</h3>{service.price != null ? <span className="whitespace-nowrap font-black text-primary">{Number(service.price).toLocaleString(locale)} {service.currency}</span> : null}</div>
                  {service.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{service.description}</p> : null}
                  {service.duration || service.unit ? <p className="mt-2 text-xs font-bold text-slate-400">{service.duration ? `${service.duration} min` : ""}{service.duration && service.unit ? " · " : ""}{service.unit}</p> : null}
                </article>)}
              </div>
            </section>
          ) : null}

          <section className="order-4 rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.06)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FiCalendar className="text-lg" />
              </span>
              <h2 className="leading-none text-2xl font-black text-slate-950">{t("hoursTitle")}</h2>
            </div>

            <div className="mt-5 space-y-3">
              {business.hours.length ? business.hours.map((hour) => (
                <div key={hour.dayOfWeek} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                  <span className="font-bold text-slate-800">{t(`days.${hour.dayOfWeek}`)}</span>
                  <span className={hour.isClosed ? "font-bold text-rose-500" : "text-slate-600"}>
                    {hour.isClosed ? t("closed") : `${hour.openTime ?? "--"} - ${hour.closeTime ?? "--"}`}
                  </span>
                </div>
              )) : (
                <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">{t("hoursUnavailable")}</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
