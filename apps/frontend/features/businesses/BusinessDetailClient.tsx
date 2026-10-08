"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiExternalLink,
  FiGlobe,
  FiGrid,
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
import { Link } from "@/i18n/navigation";
import { CategoryIcon } from "@/lib/business-categories";
import type { BusinessDetailData, BusinessReviewItem, CurrentUser } from "@/lib/api";
import { buildDirectionsUrl } from "@/lib/directions";
import { DirectoryReportButton } from "@/features/businesses/DirectoryReportButton";
import { BusinessEditButton } from "@/features/businesses/BusinessEditButton";
import { getCookieConsent, onCookieConsentChange } from "@/lib/cookie-consent";
import { getBusinessOpenStatus } from "@/lib/business-hours";
import { BusinessLocationMap } from "@/components/business/BusinessLocationMap";
import { BusinessPhotoGallery } from "@/components/business/BusinessPhotoGallery";
import { FavoriteButton } from "@/components/business/FavoriteButton";
import { CircularRatingInput, CircularRatingStars } from "@/components/ui/CircularRatingStars";
import { shouldShowBusinessGallery } from "@woyab/shared";

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

const weekDays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

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
  const router = useRouter();
  const BackIcon = locale === "fa" ? FiArrowRight : FiArrowLeft;
  const directionsHref = buildDirectionsUrl({
    address: business.address,
    city: business.location,
    latitude: business.latitude,
    longitude: business.longitude,
  });
  const categoryHref = business.categoryId ? `/businesses?categoryId=${business.categoryId}` : null;
  const subCategoryHref = business.categoryId && business.subCategoryId
    ? `/businesses?categoryId=${business.categoryId}&subCategoryId=${business.subCategoryId}`
    : null;
  const cityHref = business.cityId ? `/businesses?cityId=${business.cityId}` : null;
  const taxonomyNames = new Set(
    [business.categoryName, business.subCategoryName]
      .filter((name): name is string => Boolean(name))
      .map((name) => name.trim().toLocaleLowerCase(locale)),
  );
  const offeringTags = business.tags.filter(
    (tag) => !taxonomyNames.has(tag.name.trim().toLocaleLowerCase(locale)),
  );
  const hasValidCoordinates = typeof business.latitude === "number"
    && typeof business.longitude === "number"
    && Number.isFinite(business.latitude)
    && Number.isFinite(business.longitude)
    && business.latitude >= -90
    && business.latitude <= 90
    && business.longitude >= -180
    && business.longitude <= 180;
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [gallery, setGallery] = useState<BusinessDetailData["gallery"]>(() => business.gallery);
  const [originalReviewIds, setOriginalReviewIds] = useState<Set<string>>(new Set());
  const [originalReplyIds, setOriginalReplyIds] = useState<Set<string>>(new Set());
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
  const [mobileHoursOpen, setMobileHoursOpen] = useState(false);
  const mobileHoursRef = useRef<HTMLDivElement>(null);
  const currentDayOfWeek = weekDays[now.getDay()];
  const openStatus = getBusinessOpenStatus(business.hours, now);
  const openStatusLabel = openStatus.kind === "UNKNOWN"
    ? null
    : t(`openStatus.${openStatus.kind}`, { time: openStatus.transitionTime ?? "" });
  const reviewIdsKey = reviews.map((review) => review.id).join(",");

  function goBack() {
    // Preserve the exact directory route (including its page and filters) when
    // the detail page was opened from a listing. Direct visits still have a
    // useful directory fallback instead of leaving the application.
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/businesses");
  }

  useEffect(() => {
    if (!mobileHoursOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !mobileHoursRef.current?.contains(event.target)) {
        setMobileHoursOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileHoursOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileHoursOpen]);

  useEffect(() => {
    if (!business.googlePlaceId || business.categorySlug === "medical") return;
    const controller = new AbortController();

    void fetch(`/api/businesses/${encodeURIComponent(business.id)}/google-photos`, {
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as {
        data?: {
          photos?: Array<{
            photoReference: string;
            htmlAttributions?: string[];
            googleMapsUri?: string | null;
            authorAttributions?: Array<{ displayName: string; uri: string | null }>;
          }>;
        };
      };
      const photos = result.data?.photos ?? [];
      if (!photos.length || controller.signal.aborted) return;
      const storedGoogleCover = business.coverImageUrl?.startsWith("/media/businesses/google-place-") === true
        || business.coverImageUrl?.startsWith("/uploads/businesses/google-place-") === true;

      setGallery((current) => {
        const next = [...current];
        const existingUrls = new Set(next.map((image) => image.imageUrl));
        let changed = false;
        for (const [index, photo] of photos.entries()) {
          if (business.googleCoverPhotoReference
            ? photo.photoReference === business.googleCoverPhotoReference
            : storedGoogleCover && index === 0) continue;
          const encodedReference = photo.photoReference.split("/").map(encodeURIComponent).join("/");
          const imageUrl = `/api/businesses/${encodeURIComponent(business.id)}/google-photos/${encodedReference}?maxWidth=1200`;
          if (existingUrls.has(imageUrl)) continue;
          existingUrls.add(imageUrl);
          changed = true;
          next.push({
            id: `${business.id}-google-client-${index}`,
            imageUrl,
            caption: photo.htmlAttributions?.[0] ?? business.title,
            sourceUri: photo.googleMapsUri ?? null,
            authorAttributions: photo.authorAttributions,
          });
        }
        return changed ? next : current;
      });
    }).catch(() => undefined);

    return () => controller.abort();
  }, [business.categorySlug, business.coverImageUrl, business.googleCoverPhotoReference, business.googlePlaceId, business.id, business.title]);

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

  const galleryVisible = shouldShowBusinessGallery(business.categorySlug);
  const activeImage = galleryVisible ? gallery[0] : undefined;
  const heroImageUrl = activeImage?.imageUrl ?? business.coverImageUrl;

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
          sourceLocale: locale,
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
      <section className={`${heroImageUrl ? "" : "hero-theme"} relative isolate z-20 -mt-16 overflow-visible bg-slate-950 px-4 pb-12 pt-28 text-white sm:px-6 sm:pb-16 sm:pt-32 md:z-auto md:overflow-hidden lg:-mt-[4.75rem] lg:pb-10 lg:pt-28`}>
        {heroImageUrl ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <img src={heroImageUrl} alt="" className="h-full w-full scale-[1.02] object-cover opacity-90 blur-[4px]" />
          </div>
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(241,91,63,.26),transparent_26%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,18,31,.80)_0%,rgba(10,18,31,.62)_52%,rgba(10,18,31,.48)_100%)]" />
        <div className="relative mx-auto max-w-[1480px]">
          <div className="flex items-center justify-between gap-4">
            <button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-sm font-bold text-primary-light/90 transition hover:text-white">
              <BackIcon className="text-base" />
              {t("back")}
            </button>
            <FavoriteButton
              businessId={business.id}
              label={t("favoriteAdd")}
              savedLabel={t("favoriteRemove")}
              checkInitialSaved
              variant="hero"
            />
          </div>

          <div className="mt-6 flex flex-col gap-6 lg:mt-4 lg:flex-row lg:items-end lg:justify-between">
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
                {business.hours.length ? (
                  <div ref={mobileHoursRef} className="relative md:hidden">
                    <button
                      type="button"
                      aria-expanded={mobileHoursOpen}
                      onClick={() => setMobileHoursOpen((open) => !open)}
                      className="inline-flex items-center gap-1.5 px-1 py-1.5 font-bold text-slate-200 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:text-white focus-visible:underline"
                    >
                      {t("hoursTitle")}
                      <FiChevronDown
                        aria-hidden="true"
                        className={`transition-transform ${mobileHoursOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {mobileHoursOpen ? (
                      <div className="absolute start-0 top-full z-40 mt-2 max-h-[min(28rem,calc(100dvh-12rem))] w-[min(19rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-[0_20px_60px_rgba(15,23,42,.28)]">
                        {business.hours.map((hour) => (
                          <div
                            key={hour.dayOfWeek}
                            aria-current={hour.dayOfWeek === currentDayOfWeek ? "date" : undefined}
                            className={`flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5 text-sm ${
                              hour.dayOfWeek === currentDayOfWeek
                                ? "business-hours-today"
                                : "border-transparent odd:bg-slate-50"
                            }`}
                          >
                            <span className="font-bold">{t(`days.${hour.dayOfWeek}`)}</span>
                            <span className={hour.isClosed ? "font-bold text-rose-500" : "text-slate-600"}>
                              {hour.isClosed ? t("closed") : `${hour.openTime ?? "--"} - ${hour.closeTime ?? "--"}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{business.title}</h1>
              {business.shortDescription ? (
                <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">{business.shortDescription}</p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-slate-200">
                {business.ratingsVisible && business.reviewCount > 0 ? (
                  <>
                    <div className="flex items-center gap-3">
                      <CircularRatingStars rating={business.rating} size="sm" />
                      <span className="font-bold">{business.rating.toFixed(1)} {t("woyabRating")}</span>
                    </div>
                    <span>{t("woyabReviewsCount", { count: business.reviewCount })}</span>
                  </>
                ) : null}
                {business.ratingsVisible && business.googleRating !== null && business.googleRating !== undefined ? (
                  <div className="flex items-center gap-3">
                    <CircularRatingStars rating={business.googleRating} size="sm" />
                    <span className="font-bold">{business.googleRating.toFixed(1)} {t("googleRating")}</span>
                    <span>{t("googleReviewsCount", { count: business.googleUserRatingCount ?? 0 })}</span>
                  </div>
                ) : null}
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
        <div className="contents md:block md:space-y-8">
          {galleryVisible ? (
            <section className="overflow-hidden rounded-[30px] bg-white shadow-[0_20px_60px_rgba(15,23,42,.08)]">
              <div className="relative aspect-[16/9] bg-slate-100">
                {activeImage ? (
                  <img src={activeImage.imageUrl} alt={activeImage.caption || business.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">{business.title}</div>
                )}
                {gallery.length ? (
                  <button
                    type="button"
                    onClick={() => setGalleryOpen(true)}
                    className="absolute bottom-3 end-3 z-10 inline-flex min-h-11 max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,.35)] ring-1 ring-black/10 transition hover:bg-slate-100 sm:bottom-5 sm:end-5"
                  >
                    <FiGrid className="shrink-0 text-primary" />
                    <span className="truncate">{t("gallery.showAll", { count: gallery.length })}</span>
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.06)] sm:p-8">
            <h2 className="text-2xl font-black text-slate-950">{t("overviewTitle")}</h2>
            {business.description ? (
              <p className="mt-5 whitespace-pre-line text-base leading-8 text-slate-600">{business.description}</p>
            ) : (
              <p className="mt-5 text-base leading-8 text-slate-500">{t("descriptionFallback")}</p>
            )}

            {business.categoryName || business.subCategoryName || offeringTags.length ? (
              <div className="mt-8">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{t("taxonomyAndOfferings")}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {business.categoryName && categoryHref ? (
                    <Link
                      href={categoryHref}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                    >
                      <CategoryIcon iconKey={business.categoryIconKey} categorySlug={business.categorySlug} className="text-white" />
                      {business.categoryName}
                    </Link>
                  ) : null}
                  {business.subCategoryName && subCategoryHref ? (
                    <Link
                      href={subCategoryHref}
                      className="rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-black text-primary transition hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                    >
                      {business.subCategoryName}
                    </Link>
                  ) : null}
                  {offeringTags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/businesses?tagIds=${tag.id}`}
                      className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {hasValidCoordinates && directionsHref ? (
            <BusinessLocationMap
              latitude={business.latitude as number}
              longitude={business.longitude as number}
              title={business.title}
              address={business.address}
              directionsHref={directionsHref}
              labels={{
                title: t("map.title"),
                loading: t("map.loading"),
                error: t("map.error"),
                directions: t("map.directions"),
              }}
            />
          ) : null}

          <section id="reviews" className="order-[99] rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.06)] sm:p-8 md:order-none">
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
              {reviews.length ? reviews.map((review) => {
                const showOriginalReview = Boolean(review.isTranslated && originalReviewIds.has(review.id));
                const reviewTitle = showOriginalReview ? review.originalTitle : review.title;
                const reviewComment = showOriginalReview ? review.originalComment : review.comment;
                const showOriginalReply = Boolean(review.ownerReply?.isTranslated && originalReplyIds.has(review.id));
                const replyContent = showOriginalReply ? review.ownerReply?.originalContent : review.ownerReply?.content;
                return (
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
                          {business.ratingsVisible ? <CircularRatingStars rating={review.rating} size="sm" /> : null}
                          <DirectoryReportButton
                            targetType="review"
                            targetId={review.id}
                            targetLabel={reviewTitle || reviewComment || review.user.name}
                            currentUser={currentUser}
                          />
                        </div>
                      </div>

                      {reviewTitle ? <p dir="auto" className="mt-4 text-sm font-black text-slate-900">{reviewTitle}</p> : null}
                      {reviewComment ? <p dir="auto" className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{reviewComment}</p> : null}
                      {review.isTranslated ? (
                        <button
                          type="button"
                          onClick={() => setOriginalReviewIds((current) => {
                            const next = new Set(current);
                            if (next.has(review.id)) next.delete(review.id); else next.add(review.id);
                            return next;
                          })}
                          className="mt-3 min-h-11 text-xs font-black text-primary hover:underline"
                        >
                          {showOriginalReview ? t("reviewsSection.showTranslation") : t("reviewsSection.showOriginal")}
                        </button>
                      ) : null}
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
                          <p dir="auto" className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{replyContent}</p>
                          {review.ownerReply.isTranslated ? (
                            <button
                              type="button"
                              onClick={() => setOriginalReplyIds((current) => {
                                const next = new Set(current);
                                if (next.has(review.id)) next.delete(review.id); else next.add(review.id);
                                return next;
                              })}
                              className="mt-2 min-h-11 text-xs font-black text-primary hover:underline"
                            >
                              {showOriginalReply ? t("reviewsSection.showTranslation") : t("reviewsSection.showOriginal")}
                            </button>
                          ) : null}
                          <p className="mt-2 text-xs font-bold text-slate-400">{review.ownerReply.ownerName}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
                );
              }) : (
                <div className="rounded-3xl border border-dashed border-slate-200 px-5 py-8 text-center text-slate-500">
                  {t("reviewsSection.empty")}
                </div>
              )}
            </div>

            {business.ratingsVisible ? (
              <div className="mt-8 rounded-[28px] border border-slate-100 bg-[#fcfbfa] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <FiMessageSquare className="text-xl text-primary" />
                <h3 className="text-xl font-black text-slate-950">{t("reviewsForm.title")}</h3>
              </div>

              {currentUser ? (
                <form className="mt-5 space-y-4" onSubmit={submitReview}>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">{t("reviewsForm.ratingLabel")}</label>
                    <CircularRatingInput
                      value={reviewForm.rating}
                      onChange={(rating) => setReviewForm((current) => ({ ...current, rating }))}
                      getLabel={(rating) => t("reviewsForm.chooseStars", { count: rating })}
                    />
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
            ) : null}
          </section>
        </div>

        <aside className="contents md:flex md:flex-col md:gap-6">
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
                <h2 className="leading-none text-2xl font-black text-slate-950">{locale === "fa" ? "امکانات و موارد بیشتر" : locale === "de" ? "Ausstattung und mehr" : "Amenities and More"}</h2>
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

          <section className="order-4 hidden rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.06)] md:block">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FiCalendar className="text-lg" />
              </span>
              <h2 className="leading-none text-2xl font-black text-slate-950">{t("hoursTitle")}</h2>
            </div>

            <div className="mt-5 space-y-3">
              {business.hours.length ? business.hours.map((hour) => (
                <div
                  key={hour.dayOfWeek}
                  aria-current={hour.dayOfWeek === currentDayOfWeek ? "date" : undefined}
                  className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm ${
                    hour.dayOfWeek === currentDayOfWeek
                      ? "business-hours-today"
                      : "border-transparent bg-slate-50"
                  }`}
                >
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
      {galleryVisible && gallery.length ? (
        <BusinessPhotoGallery
          images={gallery}
          businessTitle={business.title}
          open={galleryOpen}
          rtl={locale === "fa"}
          onClose={() => setGalleryOpen(false)}
          labels={{
            title: t("gallery.title", { count: gallery.length }),
            close: t("gallery.close"),
            previous: t("gallery.previous"),
            next: t("gallery.next"),
            back: t("gallery.back"),
          }}
        />
      ) : null}
    </div>
  );
}
