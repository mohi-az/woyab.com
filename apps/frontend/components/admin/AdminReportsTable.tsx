"use client";

import { Button, ConfigProvider, Descriptions, Divider, Input, Modal, Select, Table, Tag } from "antd";
import type { TableProps } from "antd";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FiExternalLink, FiSearch, FiX } from "react-icons/fi";
import { StatusBadge } from "@/components/admin/AdminPrimitives";
import { updateReportStatus } from "@/lib/admin-actions";

const statuses = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as const;
const reasonCodes = [
  "SPAM",
  "FAKE_OR_MANIPULATED",
  "WRONG_BUSINESS",
  "ILLEGAL_CONTENT",
  "PERSONAL_DATA",
  "HATE_OR_HARASSMENT",
  "COPYRIGHT",
  "OTHER",
] as const;

export type AdminReportRow = {
  id: string;
  reason: string;
  reasonCode: string;
  message: string | null;
  status: (typeof statuses)[number];
  targetTitle: string;
  targetType: "BUSINESS" | "REVIEW";
  businessName: string | null;
  publicHref: string | null;
  reporter: string;
  reporterEmail: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  decisionReason: string | null;
  actionTaken: string | null;
  moderatorNote: string | null;
};

type Props = {
  reports: AdminReportRow[];
};

type FilterBoxProps = {
  value?: string;
  placeholder: string;
  options?: Array<{ value: string; label: string }>;
  onApply: (value: string) => void;
};

type ReportFormState = {
  status: (typeof statuses)[number];
};

function includes(value: string | null | undefined, search?: string) {
  if (!search) return true;
  return String(value ?? "").toLocaleLowerCase().includes(search.toLocaleLowerCase());
}

function FilterBox({ value, placeholder, options, onApply }: FilterBoxProps) {
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
          onPressEnter={() => onApply(draft)}
        />
      )}
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

export function AdminReportsTable({ reports }: Props) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedReport, setSelectedReport] = useState<AdminReportRow | null>(null);
  const [reportForm, setReportForm] = useState<ReportFormState>({ status: "OPEN" });
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }), [locale]);

  function setFilter(key: string, value: string) {
    setFilters((current) => {
      const next = { ...current };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  function openReport(report: AdminReportRow) {
    setSelectedReport(report);
    setReportForm({ status: report.status });
  }

  const filterIcon = (key: string) => <FiSearch className={filters[key] ? "text-sky-400" : ""} />;
  const filteredReports = reports.filter((report) => (
    includes(report.reason, filters.report)
    && includes(report.reasonCode, filters.reasonCode)
    && includes(`${report.targetTitle} ${report.businessName ?? ""} ${report.targetType}`, filters.target)
    && includes(`${report.reporter} ${report.reporterEmail ?? ""}`, filters.reporter)
    && includes(report.status, filters.status)
    && includes(dateFormatter.format(new Date(report.createdAt)), filters.createdAt)
  ));

  const columns: TableProps<AdminReportRow>["columns"] = [
    {
      title: t("fields.report"),
      key: "report",
      width: "30%",
      sorter: (a, b) => `${a.reason} ${a.message ?? ""}`.localeCompare(`${b.reason} ${b.message ?? ""}`),
      filterIcon: () => filterIcon("report"),
      filterDropdown: () => <FilterBox value={filters.report} placeholder={t("filters.search")} onApply={(value) => setFilter("report", value)} />,
      render: (_, report) => (
        <div className="max-w-xl">
          <p className="admin-title font-black">{report.reason}</p>
          <p className="admin-muted mt-1 line-clamp-2 text-sm leading-6">{report.message || "-"}</p>
        </div>
      ),
    },
    {
      title: t("reports.reason"),
      dataIndex: "reasonCode",
      key: "reasonCode",
      width: 190,
      sorter: (a, b) => a.reasonCode.localeCompare(b.reasonCode),
      filterIcon: () => filterIcon("reasonCode"),
      filterDropdown: () => (
        <FilterBox
          value={filters.reasonCode}
          placeholder={t("reports.reason")}
          onApply={(value) => setFilter("reasonCode", value)}
          options={reasonCodes.map((reason) => ({ value: reason, label: reason }))}
        />
      ),
      render: (reasonCode) => <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] font-black uppercase text-slate-300">{reasonCode}</span>,
    },
    {
      title: t("fields.target"),
      key: "target",
      width: "24%",
      sorter: (a, b) => a.targetTitle.localeCompare(b.targetTitle),
      filterIcon: () => filterIcon("target"),
      filterDropdown: () => <FilterBox value={filters.target} placeholder={t("fields.target")} onApply={(value) => setFilter("target", value)} />,
      render: (_, report) => (
        <div>
          <p className="admin-title font-black">{report.targetTitle}</p>
          <p className="admin-muted mt-1 text-xs">{report.businessName || report.targetType}</p>
        </div>
      ),
    },
    {
      title: t("fields.reporter"),
      key: "reporter",
      width: "16%",
      sorter: (a, b) => a.reporter.localeCompare(b.reporter),
      filterIcon: () => filterIcon("reporter"),
      filterDropdown: () => <FilterBox value={filters.reporter} placeholder={t("fields.reporter")} onApply={(value) => setFilter("reporter", value)} />,
      render: (_, report) => (
        <div>
          <p>{report.reporter}</p>
          {report.reporterEmail ? <p className="admin-muted mt-1 text-xs">{report.reporterEmail}</p> : null}
        </div>
      ),
    },
    {
      title: t("fields.status"),
      dataIndex: "status",
      key: "status",
      width: 140,
      sorter: (a, b) => a.status.localeCompare(b.status),
      filterIcon: () => filterIcon("status"),
      filterDropdown: () => (
        <FilterBox
          value={filters.status}
          placeholder={t("filters.allStatuses")}
          onApply={(value) => setFilter("status", value)}
          options={statuses.map((status) => ({ value: status, label: status }))}
        />
      ),
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: t("fields.time"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 190,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: "descend",
      filterIcon: () => filterIcon("createdAt"),
      filterDropdown: () => <FilterBox value={filters.createdAt} placeholder={t("fields.time")} onApply={(value) => setFilter("createdAt", value)} />,
      render: (createdAt) => <span className="admin-muted text-sm">{dateFormatter.format(new Date(createdAt))}</span>,
    },
  ];

  return (
    <ConfigProvider direction={locale === "fa" ? "rtl" : "ltr"}>
      <Table
        rowKey="id"
        className="admin-ant-table"
        columns={columns}
        dataSource={filteredReports}
        size="middle"
        getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
        pagination={{
          pageSize: 20,
          showSizeChanger: false,
          showTotal: (count, range) => t("pagination.range", { from: range[0], to: range[1], total: count }),
        }}
        onRow={(report) => ({
          onClick: () => openReport(report),
          className: "cursor-pointer",
        })}
        locale={{ emptyText: t("empty.noReports") }}
      />

      <Modal
        open={Boolean(selectedReport)}
        onCancel={() => setSelectedReport(null)}
        footer={null}
        title={null}
        width={840}
        destroyOnHidden
      >
        {selectedReport ? (
          <div className="pt-2 text-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-slate-500">{t("reports.details")}</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{selectedReport.reason}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedReport.status} />
                  <Tag className="m-0 font-bold" color="blue">{selectedReport.reasonCode}</Tag>
                  <Tag className="m-0 font-bold">{selectedReport.targetType}</Tag>
                </div>
              </div>
              {selectedReport.publicHref ? (
                <Link href={selectedReport.publicHref} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-sky-200 px-3 text-sm font-black text-sky-600 hover:bg-sky-50">
                  <FiExternalLink />
                  {t("actions.viewPublic")}
                </Link>
              ) : null}
            </div>

            <Divider className="my-4" />

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-black uppercase text-slate-500">{t("fields.report")}</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{selectedReport.message || "-"}</p>
              </section>

              <section className="rounded-lg border border-slate-200 p-4">
                <Descriptions
                  size="small"
                  column={1}
                  colon={false}
                  items={[
                    {
                      key: "target",
                      label: t("fields.target"),
                      children: (
                        <div>
                          <p className="font-black text-slate-950">{selectedReport.targetTitle}</p>
                          <p className="mt-1 text-xs text-slate-500">{selectedReport.businessName || selectedReport.targetType}</p>
                        </div>
                      ),
                    },
                    {
                      key: "reporter",
                      label: t("fields.reporter"),
                      children: (
                        <div>
                          <p className="font-bold text-slate-900">{selectedReport.reporter}</p>
                          {selectedReport.reporterEmail ? <p className="mt-1 text-xs text-slate-500">{selectedReport.reporterEmail}</p> : null}
                        </div>
                      ),
                    },
                    {
                      key: "time",
                      label: t("fields.time"),
                      children: dateFormatter.format(new Date(selectedReport.createdAt)),
                    },
                  ]}
                />
              </section>
            </div>

            <form action={updateReportStatus} className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <input type="hidden" name="id" value={selectedReport.id} />
              <input type="hidden" name="status" value={reportForm.status} />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase text-slate-500">{t("fields.status")}</span>
                  <Select
                    value={reportForm.status}
                    options={statuses.map((status) => ({ value: status, label: status }))}
                    onChange={(status) => setReportForm({ status })}
                    popupClassName="admin-ant-select-dropdown"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase text-slate-500">{t("reports.actionTaken")}</span>
                  <Input name="actionTaken" defaultValue={selectedReport.actionTaken ?? ""} />
                </label>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase text-slate-500">{t("reports.decisionReason")}</span>
                  <Input.TextArea name="decisionReason" defaultValue={selectedReport.decisionReason ?? ""} autoSize={{ minRows: 2, maxRows: 4 }} />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase text-slate-500">{t("reports.moderatorNote")}</span>
                  <Input.TextArea name="moderatorNote" defaultValue={selectedReport.moderatorNote ?? ""} autoSize={{ minRows: 2, maxRows: 4 }} />
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <Button onClick={() => setSelectedReport(null)}>{t("actions.cancel")}</Button>
                <Button htmlType="submit" type="primary">{t("actions.save")}</Button>
              </div>
            </form>
          </div>
        ) : null}
      </Modal>
    </ConfigProvider>
  );
}
