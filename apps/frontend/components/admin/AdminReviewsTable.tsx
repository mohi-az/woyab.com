"use client";

import { Button, ConfigProvider, Input, Select, Table } from "antd";
import type { TableProps } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FiCheckCircle, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import { deleteReview, setReviewStatus, setReviewVerified } from "@/lib/admin-actions";
import { StatusBadge } from "@/components/admin/AdminPrimitives";

const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;

export type AdminReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: (typeof statuses)[number];
  verified: boolean;
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
    verified?: string;
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
      width: "42%",
      filterIcon: () => filterIcon(Boolean(filters.q)),
      filterDropdown: () => <FilterBox param="q" value={filters.q} placeholder={t("filters.search")} onApply={pushParam} />,
      render: (_, review) => (
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <Stars rating={review.rating} />
            {review.verified ? <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-black text-emerald-300">{t("fields.verified")}</span> : null}
          </div>
          {review.title ? <p className="admin-title mt-1 font-black">{review.title}</p> : null}
          <p className="admin-muted mt-1 line-clamp-2 text-sm leading-6">{review.comment || "-"}</p>
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
      dataIndex: "status",
      key: "status",
      width: 130,
      filterIcon: () => filterIcon(Boolean(filters.status)),
      filterDropdown: () => (
        <FilterBox
          param="status"
          value={filters.status}
          placeholder={t("filters.allStatuses")}
          onApply={pushParam}
          options={statuses.map((status) => ({ value: status, label: status }))}
        />
      ),
      render: (status) => <StatusBadge status={status} />,
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
      width: 180,
      render: (_, review) => (
        <div className="flex items-center gap-2">
          <form action={setReviewStatus}>
            <input type="hidden" name="reviewId" value={review.id} />
            <select
              name="status"
              defaultValue={review.status}
              className="admin-input h-9 w-[112px] rounded-lg px-2 text-xs font-black outline-none focus:border-sky-400"
              aria-label={t("fields.status")}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            >
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </form>
          <form action={setReviewVerified}>
            <input type="hidden" name="reviewId" value={review.id} />
            <input type="hidden" name="verified" value={String(!review.verified)} />
            <button
              type="submit"
              className={`admin-icon-button grid h-9 w-9 place-items-center rounded-lg border ${review.verified ? "text-emerald-400" : ""}`}
              title={review.verified ? t("actions.unverify") : t("actions.verify")}
              aria-label={review.verified ? t("actions.unverify") : t("actions.verify")}
            >
              <FiCheckCircle />
            </button>
          </form>
          <form action={deleteReview}>
            <input type="hidden" name="reviewId" value={review.id} />
            <button type="submit" className="admin-icon-button grid h-9 w-9 place-items-center rounded-lg border text-rose-400" title={t("actions.delete")} aria-label={t("actions.delete")}>
              <FiTrash2 />
            </button>
          </form>
        </div>
      ),
    },
  ];

  return (
    <ConfigProvider direction={locale === "fa" ? "rtl" : "ltr"}>
      <Table
        rowKey="id"
        className="admin-ant-table"
        columns={columns}
        dataSource={reviews}
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
