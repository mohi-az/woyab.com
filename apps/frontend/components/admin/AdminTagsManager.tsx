"use client";

import type { TableProps } from "antd";
import { Button, ConfigProvider, Form, Input, Popconfirm, Space, Table, Typography } from "antd";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import { createTag, deleteTag, updateTag } from "@/lib/admin-actions";

export type AdminTagRow = {
  id: number;
  nameFa: string;
  nameEn: string | null;
  slug: string;
  businesses: number;
};

type EditableTagRow = AdminTagRow & {
  rowKey: string;
  isNew?: boolean;
};

type EditableCellProps = React.HTMLAttributes<HTMLElement> & {
  editing: boolean;
  dataIndex: keyof Pick<EditableTagRow, "nameFa" | "nameEn" | "slug">;
  cellTitle: React.ReactNode;
  required?: boolean;
  slug?: boolean;
};

type EditableTagColumn = NonNullable<TableProps<EditableTagRow>["columns"]>[number] & {
  editable?: boolean;
  editDataIndex?: keyof Pick<EditableTagRow, "nameFa" | "nameEn" | "slug">;
  required?: boolean;
  slug?: boolean;
};

const newRowKey = "new-tag";

function text(locale: string) {
  if (locale === "fa") {
    return {
      add: "\u0627\u0641\u0632\u0648\u062f\u0646 \u0628\u0631\u0686\u0633\u0628",
      edit: "\u0648\u06cc\u0631\u0627\u06cc\u0634",
      save: "\u0630\u062e\u06cc\u0631\u0647",
      cancel: "\u0644\u063a\u0648",
      discard: "\u0628\u0644\u0647\u060c \u0644\u063a\u0648 \u0634\u0648\u062f",
      keepEditing: "\u0627\u062f\u0627\u0645\u0647 \u0648\u06cc\u0631\u0627\u06cc\u0634",
      delete: "\u062d\u0630\u0641",
      nameFa: "\u0646\u0627\u0645 \u0641\u0627\u0631\u0633\u06cc",
      nameEn: "\u0646\u0627\u0645 \u0627\u0646\u06af\u0644\u06cc\u0633\u06cc",
      slug: "\u0627\u0633\u0644\u0627\u06af",
      usage: "\u0627\u0633\u062a\u0641\u0627\u062f\u0647",
      actions: "\u0639\u0645\u0644\u06cc\u0627\u062a",
      filter: "\u0641\u06cc\u0644\u062a\u0631",
      clear: "\u067e\u0627\u06a9 \u06a9\u0631\u062f\u0646",
      searchPlaceholder: "\u062c\u0633\u062a\u200c\u0648\u062c\u0648",
      required: "\u0627\u06cc\u0646 \u0641\u06cc\u0644\u062f \u0627\u0644\u0632\u0627\u0645\u06cc \u0627\u0633\u062a.",
      slugRule: "\u0641\u0642\u0637 \u062d\u0631\u0648\u0641 \u0627\u0646\u06af\u0644\u06cc\u0633\u06cc \u06a9\u0648\u0686\u06a9\u060c \u0639\u062f\u062f \u0648 \u062e\u0637 \u062a\u06cc\u0631\u0647.",
      confirmCancel: "\u062a\u063a\u06cc\u06cc\u0631\u0627\u062a \u0627\u06cc\u0646 \u0631\u062f\u06cc\u0641 \u0644\u063a\u0648 \u0634\u0648\u062f\u061f",
      confirmDelete: "\u0627\u06cc\u0646 \u0628\u0631\u0686\u0633\u0628 \u0627\u0632 \u0647\u0645\u0647 \u06a9\u0633\u0628\u200c\u0648\u06a9\u0627\u0631\u0647\u0627 \u062d\u0630\u0641 \u0645\u06cc\u200c\u0634\u0648\u062f. \u0627\u062f\u0627\u0645\u0647 \u0645\u06cc\u200c\u062f\u0647\u06cc\u062f\u061f",
      saveFailed: "\u0630\u062e\u06cc\u0631\u0647 \u0627\u0646\u062c\u0627\u0645 \u0646\u0634\u062f. \u0645\u0642\u0627\u062f\u06cc\u0631 \u0631\u0627 \u0628\u0631\u0631\u0633\u06cc \u06a9\u0646\u06cc\u062f.",
      deleteFailed: "\u062d\u0630\u0641 \u0627\u0646\u062c\u0627\u0645 \u0646\u0634\u062f.",
    };
  }

  return {
    add: "Add tag",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    discard: "Discard",
    keepEditing: "Keep editing",
    delete: "Delete",
    nameFa: "Name FA",
    nameEn: "Name EN",
    slug: "Slug",
    usage: "Usage",
    actions: "Actions",
    filter: "Filter",
    clear: "Clear",
    searchPlaceholder: "Search",
    required: "This field is required.",
    slugRule: "Use lowercase letters, numbers, and hyphens only.",
    confirmCancel: "Discard changes to this row?",
    confirmDelete: "This tag will be removed from all businesses. Continue?",
    saveFailed: "Could not save. Please check the values.",
    deleteFailed: "Could not delete the tag.",
  };
}

function EditableCell({ editing, dataIndex, cellTitle, required, slug, children, ...restProps }: React.PropsWithChildren<EditableCellProps>) {
  const locale = useLocale();
  const t = text(locale);

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            { required, message: t.required },
            ...(slug ? [{ pattern: /^[a-z0-9-]+$/, message: t.slugRule }] : []),
          ]}
        >
          <Input className="admin-input h-9 rounded-lg px-3 text-sm font-bold" aria-label={String(cellTitle)} />
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
}

function tagFormData(values: Partial<EditableTagRow>, id?: number) {
  const formData = new FormData();
  if (id) formData.append("id", String(id));
  formData.append("nameFa", String(values.nameFa ?? ""));
  formData.append("nameEn", String(values.nameEn ?? ""));
  formData.append("slug", String(values.slug ?? ""));
  return formData;
}

function textSearch(value: unknown, source: unknown) {
  return String(source ?? "").toLowerCase().includes(String(value ?? "").toLowerCase());
}

export function AdminTagsManager({ tags }: { tags: AdminTagRow[] }) {
  const locale = useLocale();
  const router = useRouter();
  const t = text(locale);
  const [form] = Form.useForm<Partial<EditableTagRow>>();
  const [editingKey, setEditingKey] = useState("");
  const [adding, setAdding] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");

  const rows = useMemo<EditableTagRow[]>(() => {
    const currentRows = tags.map((tag) => ({ ...tag, rowKey: String(tag.id) }));
    return adding
      ? [{ id: 0, rowKey: newRowKey, isNew: true, nameFa: "", nameEn: "", slug: "", businesses: 0 }, ...currentRows]
      : currentRows;
  }, [adding, tags]);

  const isEditing = (record: EditableTagRow) => record.rowKey === editingKey;

  function edit(record: EditableTagRow) {
    form.setFieldsValue({
      nameFa: record.nameFa,
      nameEn: record.nameEn ?? "",
      slug: record.slug,
    });
    setError("");
    setEditingKey(record.rowKey);
  }

  function addRow() {
    setAdding(true);
    form.setFieldsValue({ nameFa: "", nameEn: "", slug: "" });
    setError("");
    setEditingKey(newRowKey);
  }

  function cancel() {
    setEditingKey("");
    setAdding(false);
    setError("");
    form.resetFields();
  }

  async function save(record: EditableTagRow) {
    setError("");
    setSavingKey(record.rowKey);

    try {
      const values = await form.validateFields();
      if (record.isNew) await createTag(tagFormData(values));
      else await updateTag(tagFormData(values, record.id));
      setEditingKey("");
      setAdding(false);
      form.resetFields();
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t.saveFailed);
    } finally {
      setSavingKey("");
    }
  }

  async function remove(record: EditableTagRow) {
    setError("");
    setSavingKey(record.rowKey);
    const formData = new FormData();
    formData.append("id", String(record.id));

    try {
      await deleteTag(formData);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t.deleteFailed);
    } finally {
      setSavingKey("");
    }
  }

  function searchColumn(dataIndex: keyof Pick<EditableTagRow, "nameFa" | "nameEn" | "slug">) {
    return {
      filterIcon: (filtered: boolean) => <FiSearch className={filtered ? "text-sky-400" : ""} />,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: {
        setSelectedKeys: (keys: React.Key[]) => void;
        selectedKeys: React.Key[];
        confirm: (param?: { closeDropdown: boolean }) => void;
        clearFilters?: () => void;
      }) => (
        <div className="grid w-64 gap-2 p-2">
          <Input
            autoFocus
            value={String(selectedKeys[0] ?? "")}
            placeholder={`${t.searchPlaceholder} ${String(dataIndex)}`}
            allowClear
            onChange={(event) => setSelectedKeys(event.target.value ? [event.target.value] : [])}
            onPressEnter={() => confirm({ closeDropdown: true })}
          />
          <div className="flex gap-2">
            <Button size="small" type="primary" icon={<FiSearch />} onClick={() => confirm({ closeDropdown: true })}>{t.filter}</Button>
            <Button size="small" icon={<FiX />} onClick={() => {
              clearFilters?.();
              confirm({ closeDropdown: true });
            }}>{t.clear}</Button>
          </div>
        </div>
      ),
      onFilter: (value: boolean | React.Key, record: EditableTagRow) => textSearch(value, record[dataIndex]),
    };
  }

  const columns: EditableTagColumn[] = [
    { title: t.nameFa, dataIndex: "nameFa", width: "28%", editable: true, editDataIndex: "nameFa", required: true, ...searchColumn("nameFa") },
    { title: t.nameEn, dataIndex: "nameEn", width: "24%", editable: true, editDataIndex: "nameEn", ...searchColumn("nameEn") },
    { title: t.slug, dataIndex: "slug", width: "22%", editable: true, editDataIndex: "slug", required: true, slug: true, ...searchColumn("slug") },
    {
      title: t.usage,
      dataIndex: "businesses",
      width: 120,
      sorter: (a, b) => a.businesses - b.businesses,
      render: (count) => <span className="inline-flex h-8 min-w-10 items-center justify-center rounded-lg border border-white/10 px-2 text-xs font-black">{count}</span>,
    },
    {
      title: t.actions,
      key: "actions",
      fixed: "right",
      width: 190,
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <Space size="middle">
            <Typography.Link disabled={savingKey === record.rowKey} onClick={() => save(record)}>
              {t.save}
            </Typography.Link>
            <Popconfirm title={t.confirmCancel} okText={t.discard} cancelText={t.keepEditing} onConfirm={cancel}>
              <Typography.Link>{t.cancel}</Typography.Link>
            </Popconfirm>
          </Space>
        ) : (
          <Space size="middle">
            <Typography.Link disabled={editingKey !== ""} onClick={() => edit(record)}>
              <span className="inline-flex items-center gap-1"><FiEdit2 />{t.edit}</span>
            </Typography.Link>
            <Popconfirm title={t.confirmDelete} okText={t.delete} cancelText={t.cancel} onConfirm={() => remove(record)}>
              <Typography.Link disabled={editingKey !== ""} type="danger">
                <span className="inline-flex items-center gap-1"><FiTrash2 />{t.delete}</span>
              </Typography.Link>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const mergedColumns: TableProps<EditableTagRow>["columns"] = columns.map((column) => {
    if (!column.editable || !column.editDataIndex) return column;

    return {
      ...column,
      onCell: (record: EditableTagRow) => ({
        record,
        editing: isEditing(record),
        dataIndex: column.editDataIndex,
        cellTitle: column.title,
        required: column.required,
        slug: column.slug,
      }) as React.HTMLAttributes<HTMLElement>,
    };
  });

  return (
    <ConfigProvider direction={locale === "fa" ? "rtl" : "ltr"}>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="primary" icon={<FiPlus />} disabled={editingKey !== ""} onClick={addRow}>
            {t.add}
          </Button>
          {error ? <p className="text-sm font-bold text-rose-300">{error}</p> : null}
        </div>

        <Form form={form} component={false}>
          <Table<EditableTagRow>
            rowKey="rowKey"
            className="admin-ant-table"
            components={{ body: { cell: EditableCell } }}
            columns={mergedColumns}
            dataSource={rows}
            size="middle"
            bordered
            tableLayout="fixed"
            scroll={{ x: 900 }}
            pagination={{ pageSize: 10, onChange: cancel }}
            getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
          />
        </Form>
      </div>
    </ConfigProvider>
  );
}
