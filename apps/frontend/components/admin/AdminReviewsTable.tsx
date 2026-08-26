"use client";

import { Button, ConfigProvider, Input, Select, Table } from "antd";
import type { TableProps } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { FiLoader, FiRefreshCw, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import { deleteReview, retryReviewTranslationAction, setReviewStatus } from "@/lib/admin-actions";
import { StatusBadge } from "@/components/admin/AdminPrimitives";

const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;
type TranslationStatus = "NOT_REQUESTED" | "PENDING" | "PROCESSING" | "PARTIAL" | "READY" | "FAILED";

export type AdminReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: (typeof statuses)[number];
  translationStatus: TranslationStatus;
  translationAttemptCount: number;
  translationError: string | null;
  ownerReplyTranslationStatus: TranslationStatus | null;
  ownerReplyTranslationError: string | null;
  createdAt: string;
  businessName: string;
  businessSlug: string;
  author: string;
};

type Props = {
  reviews: AdminReviewRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: {
    q?: string;
    business?: string;
    author?: string;
    status?: string;
    rating?: string;
  };
};

type FilterBoxProps = {
  param: keyof Props["filters"];
  value?: string;
  placeholder: string;
  options?: Array<{ value: string; label: string }>;
  onApply: (param: keyof Props["filters"], value: string) => void;
};

function FilterBox({ param, value, placeholder, options, onApply }: FilterBoxProps) {
  const t = useTranslations("Admin");
  const [draft, setDraft] = useState(value ?? "");

  return (
    <div className="grid w-64 gap-2 p-2">
      {options ? (
        <Select
          allowClear
          showSearch
          value={draft || undefined}
          placeholder={placeholder}
          options={options}
          className="admin-ant-select"
          popupClassName="admin-ant-select-dropdown"
          onChange={(next) => setDraft(next ?? "")}
          optionFilterProp="label"
        />
      ) : (
        <Input
          value={draft}
          placeholder={placeholder}
          allowClear
          onChange={(event) => setDraft(event.target.value)}
          onPressEnter={() => onApply(param, draft)}
        />
      )}
      <div className="flex gap-2">
        <Button size="small" type="primary" icon={<FiSearch />} onClick={() => onApply(param, draft)}>{t("actions.filter")}</Button>
        <Button size="small" icon={<FiX />} onClick={() => {
          setDraft("");
          onApply(param, "");
        }}>{t("actions.clear")}</Button>
      </div>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return <span className="text-xs font-black text-amber-400">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>;
}

export function AdminReviewsTable({ reviews, total, page, pageSize, filters }: Props) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);

  const [optimisticReviews, setOptimisticStatus] = useOptimistic(
    reviews,
    (current, update: { id: string; status: AdminReviewRow["status"] }) =>
      current.map((item) => (item.id === update.id ? { ...item, status: update.status } : item))
  );

  function pushParam(param: keyof Props["filters"] | "page", value: string) {
    const query = new URLSearchParams(searchParams.toString());
    if (value) query.set(param, value);
    else query.delete(param);
    if (param !== "page") query.delete("page");
    router.push(`${pathname}?${query.toString()}`);
  }

  const filterIcon = (active?: boolean) => <FiSearch className={active ? "text-sky-400" : ""} />;
  const columns: TableProps<AdminReviewRow>["columns"] = [
    {
      title: t("fields.review"),
      dataIndex: "comment",
      key: "review",
      width: "40%",
      filterIcon: () => filterIcon(Boolean(filters.q)),
      filterDropdown: () => <FilterBox param="q" value={filters.q} placeholder={t("filters.search")} onApply={pushParam} />,
      render: (_, review) => (
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <Stars rating={review.rating} />
          </div>
          {review.title ? <p className="admin-title mt-1 font-black">{review.title}</p> : null}
          <p className="admin-muted mt-1 line-clamp-2 text-sm leading-6">{review.comment || "-"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-1 font-black ${review.translationStatus === "READY" ? "bg-emerald-500/15 text-emerald-400" : review.translationStatus === "FAILED" || review.translationStatus === "PARTIAL" ? "bg-rose-500/15 text-rose-400" : "bg-slate-500/15 text-slate-400"}`}>
              Translation: {review.translationStatus}
            </span>
            {review.translationAttemptCount ? <span className="admin-muted">Attempts: {review.translationAttemptCount}/5</span> : null}
          </div>
          {review.translationError ? <p title={review.translationError} className="mt-1 line-clamp-1 text-xs text-rose-400">{review.translationError}</p> : null}
          {review.ownerReplyTranslationStatus ? (
            <p className="admin-muted mt-1 text-xs">Owner reply: {review.ownerReplyTranslationStatus}</p>
          ) : null}
          {review.ownerReplyTranslationError ? <p title={review.ownerReplyTranslationError} className="mt-1 line-clamp-1 text-xs text-rose-400">{review.ownerReplyTranslationError}</p> : null}
        </div>
      ),
    },
    {
      title: t("fields.business"),
      dataIndex: "businessName",
      key: "business",
      width: "18%",
      filterIcon: () => filterIcon(Boolean(filters.business)),
      filterDropdown: () => <FilterBox param="business" value={filters.business} placeholder={t("fields.business")} onApply={pushParam} />,
      render: (value, review) => (
        <div>
          <p className="admin-title font-black">{value}</p>
          <p className="admin-muted truncate text-xs">{review.businessSlug}</p>
        </div>
      ),
    },
    {
      title: t("fields.author"),
      dataIndex: "author",
      key: "author",
      width: "14%",
      filterIcon: () => filterIcon(Boolean(filters.author)),
      filterDropdown: () => <FilterBox param="author" value={filters.author} placeholder={t("fields.author")} onApply={pushParam} />,
    },
    {
      title: t("fields.status"),
      key: "status",
      width: 140,
      filterIcon: () => filterIcon(Boolean(filters.status)),
      filterDropdown: () => (
        <FilterBox
          param="status"
          value={filters.status}
          placeholder={t("filters.allStatuses")}
          onApply={pushParam}
          options={statuses.map((status) => ({
            value: status,
            label: t(`statuses.${status}`),
          }))}
        />
      ),
      render: (_, review) => <StatusBadge status={review.status} label={t(`statuses.${review.status}`)} />,
    },
    {
      title: t("fields.rating"),
      dataIndex: "rating",
      key: "rating",
      width: 110,
      filterIcon: () => filterIcon(Boolean(filters.rating)),
      filterDropdown: () => (
        <FilterBox
          param="rating"
          value={filters.rating}
          placeholder={t("fields.rating")}
          onApply={pushParam}
          options={[1, 2, 3, 4, 5].map((rating) => ({ value: String(rating), label: `${rating}` }))}
        />
      ),
      render: (rating) => <Stars rating={rating} />,
    },
    {
      title: t("fields.actions"),
      key: "actions",
      width: 230,
      render: (_, review) => {
        const isRowPending = isPending && pendingReviewId === review.id;
        return (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Select
                value={review.status}
                disabled={isRowPending}
                loading={isRowPending}
                onChange={(nextStatus) => {
                  setPendingReviewId(review.id);
                  startTransition(async () => {
                    setOptimisticStatus({ id: review.id, status: nextStatus });
                    const formData = new FormData();
                    formData.append("reviewId", review.id);
                    formData.append("status", nextStatus);
                    await setReviewStatus(formData);
                  });
                }}
                options={statuses.map((status) => ({
                  value: status,
                  label: t(`statuses.${status}`),
                }))}
                className="admin-ant-select w-[140px]"
                popupClassName="admin-ant-select-dropdown"
              />
            </div>

            {review.status === "APPROVED" && (review.translationStatus !== "READY" || (review.ownerReplyTranslationStatus && review.ownerReplyTranslationStatus !== "READY")) ? (
              <button
                type="button"
                disabled={isRowPending}
                onClick={() => {
                  setPendingReviewId(review.id);
                  startTransition(async () => {
                    const formData = new FormData();
                    formData.append("reviewId", review.id);
                    await retryReviewTranslationAction(formData);
                    router.refresh();
                  });
                }}
                className="admin-icon-button grid h-9 w-9 place-items-center rounded-lg border text-sky-400 disabled:opacity-50"
                title="Retry translation"
                aria-label="Retry translation"
              >
                {isRowPending ? <FiLoader className="animate-spin" /> : <FiRefreshCw />}
              </button>
            ) : null}

            <form action={deleteReview}>
              <input type="hidden" name="reviewId" value={review.id} />
              <button
                type="submit"
                className="admin-icon-button grid h-9 w-9 place-items-center rounded-lg border text-rose-400"
                title={t("actions.delete")}
                aria-label={t("actions.delete")}
              >
                <FiTrash2 />
              </button>
            </form>
          </div>
        );
      },
    },
  ];

  return (
    <ConfigProvider direction={locale === "fa" ? "rtl" : "ltr"}>
      <Table
        rowKey="id"
        className="admin-ant-table"
        columns={columns}
        dataSource={optimisticReviews}
        size="middle"
        pagination={{
          current: page,
          total,
          pageSize,
          showSizeChanger: false,
          showTotal: (count, range) => t("pagination.range", { from: range[0], to: range[1], total: count }),
          onChange: (nextPage) => pushParam("page", String(nextPage)),
        }}
        getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
        locale={{ emptyText: t("empty.noPendingReviews") }}
      />
    </ConfigProvider>
  );
}
