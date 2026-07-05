"use client";

import { Button, ConfigProvider, Input, Table } from "antd";
import type { TableProps } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { StatusBadge } from "@/components/admin/AdminPrimitives";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
  reviews: number;
  favorites: number;
};

type Props = {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  q?: string;
};

function UserFilter({ value, onApply }: { value?: string; onApply: (value: string) => void }) {
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

export function AdminUsersTable({ users, total, page, pageSize, q }: Props) {
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

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const columns: TableProps<AdminUserRow>["columns"] = [
    {
      title: t("fields.user"),
      key: "user",
      width: "38%",
      filterIcon: () => <FiSearch className={q ? "text-sky-400" : ""} />,
      filterDropdown: () => <UserFilter value={q} onApply={(value) => pushParam("q", value)} />,
      render: (_, user) => (
        <div>
          <p className="admin-title font-black">{user.name || t("shell.fallbackName")}</p>
          <p className="admin-muted mt-1 text-xs">{user.email || user.phone || user.id}</p>
        </div>
      ),
    },
    {
      title: t("fields.contact"),
      key: "contact",
      render: (_, user) => (
        <div className="grid gap-1 text-sm">
          <span>{user.email || "-"}</span>
          <span className="admin-muted text-xs">{user.phone || "-"}</span>
        </div>
      ),
    },
    {
      title: t("fields.status"),
      dataIndex: "active",
      width: 130,
      render: (active) => <StatusBadge status={active ? "ACTIVE" : "SUSPENDED"} />,
    },
    {
      title: t("fields.activity"),
      key: "activity",
      width: 190,
      render: (_, user) => t("users.activity", { reviews: user.reviews, favorites: user.favorites }),
    },
    {
      title: t("fields.joined"),
      dataIndex: "createdAt",
      width: 150,
      render: (createdAt) => <span className="admin-muted text-sm">{dateFormatter.format(new Date(createdAt))}</span>,
    },
  ];

  return (
    <ConfigProvider direction={locale === "fa" ? "rtl" : "ltr"}>
      <Table
        rowKey="id"
        className="admin-ant-table"
        columns={columns}
        dataSource={users}
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
