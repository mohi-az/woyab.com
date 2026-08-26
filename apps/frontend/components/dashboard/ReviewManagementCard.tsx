"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import { Link } from "@/i18n/navigation";
import { CircularRatingInput, CircularRatingStars } from "@/components/ui/CircularRatingStars";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

type Props = {
  review: {
    id: string;
    rating: number;
    title: string | null;
    comment: string | null;
    status: ReviewStatus;
    businessName: string;
    businessSlug: string;
  };
};

const statusStyle = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
};

export function ReviewManagementCard({ review: initialReview }: Props) {
  const t = useTranslations("Dashboard.reviews");
  const [review, setReview] = useState(initialReview);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review.rating);
  const [title, setTitle] = useState(review.title ?? "");
  const [comment, setComment] = useState(review.comment ?? "");
  const [pending, setPending] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title.trim() || null, comment: comment.trim() }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setFeedback(json?.error ?? t("updateError"));
        return;
      }
      setReview((current) => ({
        ...current,
        rating,
        title: title.trim() || null,
        comment: comment.trim(),
        status: "PENDING",
      }));
      setEditing(false);
      setFeedback(t("updateSuccess"));
    } catch {
      setFeedback(t("updateError"));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (pending || !window.confirm(t("deleteConfirm"))) return;
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setFeedback(json?.error ?? t("deleteError"));
        return;
      }
      setDeleted(true);
    } catch {
      setFeedback(t("deleteError"));
    } finally {
      setPending(false);
    }
  }

  if (deleted) {
    return <p className="rounded-2xl border border-dashed bg-white p-6 text-center text-sm text-slate-500">{t("deleteSuccess")}</p>;
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/businesses/${review.businessSlug}`} className="font-black hover:text-primary">
            {review.businessName}
          </Link>
          <CircularRatingStars
            rating={review.rating}
            size="sm"
            label={t("ratingValue", { count: review.rating })}
            className="mt-2"
          />
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle[review.status]}`}>
          {t(`status.${review.status}`)}
        </span>
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-5 space-y-4 border-t border-slate-100 pt-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">{t("rating")}</label>
            <CircularRatingInput
              value={rating}
              onChange={setRating}
              getLabel={(option) => t("ratingValue", { count: option })}
            />
          </div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            placeholder={t("titlePlaceholder")}
            className="min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-primary"
          />
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            required
            minLength={3}
            maxLength={2000}
            rows={5}
            placeholder={t("commentPlaceholder")}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <p className="text-xs leading-5 text-amber-700">{t("moderationNotice")}</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-white disabled:opacity-60">
              {pending ? t("saving") : t("save")}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold text-slate-600">
              <FiX /> {t("cancel")}
            </button>
          </div>
        </form>
      ) : (
        <>
          {review.title ? <p className="mt-4 font-bold text-slate-700">{review.title}</p> : null}
          {review.comment ? <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-500">{review.comment}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button type="button" disabled={pending} onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-primary hover:text-primary">
              <FiEdit2 /> {t("edit")}
            </button>
            <button type="button" disabled={pending} onClick={remove} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
              <FiTrash2 /> {t("delete")}
            </button>
          </div>
        </>
      )}

      {feedback ? <p role="status" className="mt-3 text-sm text-slate-600">{feedback}</p> : null}
    </article>
  );
}
