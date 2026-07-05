"use client";

import { Button, ConfigProvider, Input, Table } from "antd";
import type { TableProps } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { StatusBadge } from "@/components/admin/AdminPrimitives";
import { Link } from "@/i18n/navigation";

export type AdminOwnerRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
  businesses: number;
  activeBusinesses: number;
  pendingBusinesses: number;
  suspendedBusinesses: number;
  totalReviews: number;
  claims: number;
  latestBusiness: { name: string; slug: string } | null;
};

type Props = {
  owners: AdminOwnerRow[];
  total: number;
  page: number;
  pageSize: number;
  q?: string;
};

function OwnerFilter({ value, onApply }: { value?: string; onApply: (value: string) => void }) {
  const t = useTranslations("Admin");
  const [draft, setDraft] = useState(value ?? "");

  return (
    <div className="grid w-64 gap-2 p-2">
      <Input value={draft} placeholder={t("filters.search")} allowClear onChange={(event) => setDraft(event.target.value)} onPressEnter={() => onApply(draft)} />
      <div className="flex gap-2">
        <Button size="small" type="primary" icon={<FiSearch />} onClick={() => onApply(draft)}>{t("actions.filter")}</Button>
        <Button size="small" icon={<FiX />} onClick={() => {
          setDraft("");
          onApply("");
        }}>{t("actions.clear")}</Button>
      </div>
    </div>
  );
}

export function AdminOwnersTable({ owners, total, page, pageSize, q }: Props) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pushParam(param: "q" | "page", value: string) {
    const query = new URLSearchParams(searchParams.toString());
    if (value) query.set(param, value);
    else query.delete(param);
    if (param !== "page") query.delete("page");
    router.push(`${pathname}?${query.toString()}`);
  }

  const columns: TableProps<AdminOwnerRow>["columns"] = [
    {
      title: t("fields.owner"),
      key: "owner",
      width: "28%",
      filterIcon: () => <FiSearch className={q ? "text-sky-400" : ""} />,
      filterDropdown: () => <OwnerFilter value={q} onApply={(value) => pushParam("q", value)} />,
      render: (_, owner) => (
        <div>
          <p className="admin-title font-black">{owner.name || t("shell.fallbackName")}</p>
          <p className="admin-muted mt-1 text-xs">{owner.email || owner.phone || owner.id}</p>
        </div>
      ),
    },
    {
      title: t("fields.status"),
      dataIndex: "active",
      width: 120,
      render: (active) => <StatusBadge status={active ? "ACTIVE" : "SUSPENDED"} />,
    },
    {
      title: t("fields.businesses"),
      key: "businesses",
      width: "24%",
      render: (_, owner) => (
        <div className="grid gap-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-sky-400/15 px-2 py-1 text-xs font-black text-sky-300">{t("owners.totalListings", { count: owner.businesses })}</span>
            <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs font-black text-emerald-300">{t("owners.activeListings", { count: owner.activeBusinesses })}</span>
            <span className="rounded-full bg-amber-400/15 px-2 py-1 text-xs font-black text-amber-300">{t("owners.pendingListings", { count: owner.pendingBusinesses })}</span>
          </div>
          {owner.latestBusiness ? (
            <Link href={`/admin/businesses?q=${encodeURIComponent(owner.latestBusiness.slug)}`} className="admin-muted text-xs hover:text-sky-300">
              {owner.latestBusiness.name}
            </Link>
          ) : null}
        </div>
      ),
    },
    {
      title: t("fields.reviews"),
      dataIndex: "totalReviews",
      width: 120,
      render: (value) => <span className="admin-title font-black">{value}</span>,
    },
    {
      title: t("fields.claims"),
      dataIndex: "claims",
      width: 120,
      render: (value) => <span className="admin-title font-black">{value}</span>,
    },
    {
      title: t("fields.contact"),
      key: "contact",
      render: (_, owner) => (
        <div className="grid gap-1 text-sm">
          <span>{owner.email || "-"}</span>
          <span className="admin-muted text-xs">{owner.phone || "-"}</span>
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
        dataSource={owners}
        size="middle"
        getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
        pagination={{
          current: page,
          total,
          pageSize,
          showSizeChanger: false,
          showTotal: (count, range) => t("pagination.range", { from: range[0], to: range[1], total: count }),
          onChange: (nextPage) => pushParam("page", String(nextPage)),
        }}
      />
    </ConfigProvider>
  );
}
