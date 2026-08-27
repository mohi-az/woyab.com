"use client";

import { Button, ConfigProvider, Modal, Table } from "antd";
import type { TableProps } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { FiMail } from "react-icons/fi";
import { AdminButton, StatusBadge } from "@/components/admin/AdminPrimitives";
import { archivePublicContactMessage } from "@/lib/admin-actions";

const subjects = ["GENERAL", "ACCOUNT", "BUSINESS_OWNERSHIP", "PARTNERSHIP", "PRIVACY", "OTHER"] as const;

type Subject = (typeof subjects)[number];
type DeliveryStatus = "PENDING" | "SENT" | "FAILED" | "NOT_CONFIGURED";

export type AdminPublicContactRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: Subject;
  message: string;
  status: "NEW" | "ARCHIVED";
  notificationStatus: DeliveryStatus;
  notificationError: string | null;
  acknowledgementStatus: DeliveryStatus;
  acknowledgementError: string | null;
  createdAt: string;
  updatedAt: string;
};

export function AdminPublicContactTable({ messages }: { messages: AdminPublicContactRow[] }) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const [selectedMessage, setSelectedMessage] = useState<AdminPublicContactRow | null>(null);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

  const columns: TableProps<AdminPublicContactRow>["columns"] = [
    {
      title: t("fields.from"),
      key: "sender",
      width: 220,
      render: (_, message) => (
        <div>
          <strong className="admin-title">{message.name}</strong>
          <p className="admin-muted mt-1 text-xs" dir="ltr">{message.email}</p>
          {message.phone ? <p className="admin-muted mt-1 text-xs" dir="ltr">{message.phone}</p> : null}
        </div>
      ),
    },
    {
      title: t("publicContact.subject"),
      dataIndex: "subject",
      key: "subject",
      width: 190,
      filters: subjects.map((subject) => ({ text: t(`publicContact.subjects.${subject}`), value: subject })),
      filterMultiple: false,
      filterSearch: true,
      onFilter: (value, message) => message.subject === String(value),
      sorter: (a, b) => a.subject.localeCompare(b.subject),
      render: (subject: Subject) => t(`publicContact.subjects.${subject}`),
    },
    {
      title: t("fields.message"),
      dataIndex: "message",
      key: "message",
      render: (message: string) => <p className="admin-muted line-clamp-2 max-w-xl whitespace-pre-line text-sm leading-6">{message}</p>,
    },
    {
      title: t("fields.status"),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: t("publicContact.emailDelivery"),
      key: "delivery",
      width: 170,
      render: (_, message) => (
        <div>
          <StatusBadge status={message.notificationStatus} />
          <p className="admin-muted mt-2 text-xs">
            {t("publicContact.receipt")}: {message.acknowledgementStatus}
          </p>
        </div>
      ),
    },
    {
      title: t("fields.actions"),
      key: "actions",
      width: 120,
      render: (_, message) => message.status !== "ARCHIVED" ? (
        <form
          action={archivePublicContactMessage}
          onClick={(event) => event.stopPropagation()}
          onSubmit={(event) => event.stopPropagation()}
        >
          <input type="hidden" name="id" value={message.id} />
          <AdminButton tone="success">{t("publicContact.archive")}</AdminButton>
        </form>
      ) : null,
    },
  ];

  return (
    <ConfigProvider direction={locale === "fa" ? "rtl" : "ltr"}>
      <Table
        rowKey="id"
        className="admin-ant-table"
        columns={columns}
        dataSource={messages}
        size="middle"
        scroll={{ x: 1050 }}
        getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
        pagination={{
          pageSize: 20,
          showSizeChanger: false,
          showTotal: (count, range) => t("pagination.range", { from: range[0], to: range[1], total: count }),
        }}
        onRow={(message) => ({
          onClick: () => setSelectedMessage(message),
          className: "cursor-pointer",
        })}
        locale={{ emptyText: t("empty.noPublicContact"), filterConfirm: t("actions.filter"), filterReset: t("actions.clear") }}
      />

      <Modal
        open={Boolean(selectedMessage)}
        onCancel={() => setSelectedMessage(null)}
        footer={null}
        title={null}
        width={820}
        destroyOnHidden
      >
        {selectedMessage ? (
          <div className="pt-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="admin-muted text-xs font-black uppercase tracking-wide">{t("publicContact.details")}</p>
                <h2 className="admin-title mt-1 text-xl font-black">{t(`publicContact.subjects.${selectedMessage.subject}`)}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={selectedMessage.status} />
                  <StatusBadge status={selectedMessage.notificationStatus} label={`${t("publicContact.notification")}: ${selectedMessage.notificationStatus}`} />
                  <StatusBadge status={selectedMessage.acknowledgementStatus} label={`${t("publicContact.receipt")}: ${selectedMessage.acknowledgementStatus}`} />
                </div>
              </div>
              <a
                href={`mailto:${selectedMessage.email}`}
                className="admin-secondary-link inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-black"
                dir="ltr"
              >
                <FiMail />
                {t("publicContact.reply")}
              </a>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail label={t("fields.from")}>
                <p className="admin-title font-black">{selectedMessage.name}</p>
                <a href={`mailto:${selectedMessage.email}`} className="mt-1 block text-sm text-sky-400 hover:underline" dir="ltr">{selectedMessage.email}</a>
                {selectedMessage.phone ? <a href={`tel:${selectedMessage.phone}`} className="admin-muted mt-1 block text-sm hover:underline" dir="ltr">{selectedMessage.phone}</a> : null}
              </Detail>
              <Detail label={t("publicContact.receivedAt")}>
                <p className="admin-title text-sm">{dateFormatter.format(new Date(selectedMessage.createdAt))}</p>
                <p className="admin-muted mt-2 break-all text-xs" dir="ltr">{t("publicContact.requestId")}: {selectedMessage.id}</p>
              </Detail>
            </div>

            <div className="mt-4">
              <Detail label={t("fields.message")}>
                <p className="admin-title whitespace-pre-wrap break-words text-sm leading-7">{selectedMessage.message}</p>
              </Detail>
            </div>

            {(selectedMessage.notificationError || selectedMessage.acknowledgementError) ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {selectedMessage.notificationError ? <DeliveryError label={t("publicContact.notification")} error={selectedMessage.notificationError} /> : null}
                {selectedMessage.acknowledgementError ? <DeliveryError label={t("publicContact.receipt")} error={selectedMessage.acknowledgementError} /> : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button onClick={() => setSelectedMessage(null)}>{t("publicContact.close")}</Button>
              {selectedMessage.status !== "ARCHIVED" ? (
                <form action={archivePublicContactMessage} onSubmit={() => setSelectedMessage(null)}>
                  <input type="hidden" name="id" value={selectedMessage.id} />
                  <AdminButton tone="success">{t("publicContact.archive")}</AdminButton>
                </form>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </ConfigProvider>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="admin-field-panel h-full rounded-lg border p-4">
      <p className="admin-muted mb-3 text-xs font-black uppercase tracking-wide">{label}</p>
      {children}
    </section>
  );
}

function DeliveryError({ label, error }: { label: string; error: string }) {
  return (
    <section className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-4">
      <p className="text-xs font-black uppercase text-rose-300">{label}</p>
      <p className="mt-2 break-words text-xs leading-6 text-rose-200">{error}</p>
    </section>
  );
}
