"use client";

import type { AttributeDataType } from "@woyab/database";
import type { TableProps } from "antd";
import { Button, ConfigProvider, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Tooltip } from "antd";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { FiCheck, FiEdit2, FiPlus, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import { createAttributeDefinition, deleteAttributeDefinition, updateAttributeDefinition } from "@/lib/admin-actions";

export type AdminAttributeDefinitionRow = {
  id: number;
  key: string;
  labelFa: string;
  labelEn: string | null;
  labelDe: string | null;
  dataType: AttributeDataType;
  unit: string | null;
  options: string | null;
  sortOrder: number;
  active: boolean;
  values: number;
};

type EditableAttributeRow = AdminAttributeDefinitionRow & {
  rowKey: string;
  isNew?: boolean;
};

type EditableDataIndex = keyof Pick<
  EditableAttributeRow,
  "key" | "labelFa" | "labelEn" | "labelDe" | "dataType" | "sortOrder"
>;

type CellInput = "text" | "textarea" | "number" | "select" | "switch";

type EditableCellProps = React.HTMLAttributes<HTMLElement> & {
  record: EditableAttributeRow;
  editing: boolean;
  dataIndex: EditableDataIndex;
  cellTitle: React.ReactNode;
  inputType: CellInput;
  required?: boolean;
  keyField?: boolean;
  selectOptions?: { label: string; value: string }[];
};

type EditableAttributeColumn = NonNullable<TableProps<EditableAttributeRow>["columns"]>[number] & {
  editable?: boolean;
  editDataIndex?: EditableDataIndex;
  inputType?: CellInput;
  required?: boolean;
  keyField?: boolean;
  selectOptions?: { label: string; value: string }[];
};

const newRowKey = "new-attribute";
const dataTypes: AttributeDataType[] = ["BOOLEAN", "TEXT", "NUMBER"];

function supportedDataType(value: AttributeDataType | null | undefined): AttributeDataType {
  return value && dataTypes.includes(value) ? value : "TEXT";
}

function text(locale: string) {
  if (locale === "fa") {
    return {
      add: "\u0627\u0641\u0632\u0648\u062f\u0646 \u0627\u0645\u06a9\u0627\u0646",
      edit: "\u0648\u06cc\u0631\u0627\u06cc\u0634",
      save: "\u0630\u062e\u06cc\u0631\u0647",
      cancel: "\u0644\u063a\u0648",
      discard: "\u0628\u0644\u0647\u060c \u0644\u063a\u0648 \u0634\u0648\u062f",
      keepEditing: "\u0627\u062f\u0627\u0645\u0647 \u0648\u06cc\u0631\u0627\u06cc\u0634",
      delete: "\u062d\u0630\u0641",
      key: "\u06a9\u0644\u06cc\u062f",
      labelFa: "\u0639\u0646\u0648\u0627\u0646 \u0641\u0627\u0631\u0633\u06cc",
      labelEn: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0646\u06af\u0644\u06cc\u0633\u06cc",
      labelDe: "\u0639\u0646\u0648\u0627\u0646 \u0622\u0644\u0645\u0627\u0646\u06cc",
      type: "\u0646\u0648\u0639",
      sort: "\u062a\u0631\u062a\u06cc\u0628",
      active: "\u0641\u0639\u0627\u0644",
      inactive: "\u063a\u06cc\u0631\u0641\u0639\u0627\u0644",
      values: "\u0627\u0633\u062a\u0641\u0627\u062f\u0647",
      actions: "\u0639\u0645\u0644\u06cc\u0627\u062a",
      enable: "\u0641\u0639\u0627\u0644/\u063a\u06cc\u0631\u0641\u0639\u0627\u0644",
      filter: "\u0641\u06cc\u0644\u062a\u0631",
      clear: "\u067e\u0627\u06a9 \u06a9\u0631\u062f\u0646",
      searchPlaceholder: "\u062c\u0633\u062a\u200c\u0648\u062c\u0648",
      required: "\u0627\u06cc\u0646 \u0641\u06cc\u0644\u062f \u0627\u0644\u0632\u0627\u0645\u06cc \u0627\u0633\u062a.",
      keyRule: "\u0641\u0642\u0637 \u062d\u0631\u0648\u0641 \u0627\u0646\u06af\u0644\u06cc\u0633\u06cc \u06a9\u0648\u0686\u06a9\u060c \u0639\u062f\u062f \u0648 \u0622\u0646\u062f\u0631\u0633\u06a9\u0648\u0631.",
      confirmCancel: "\u062a\u063a\u06cc\u06cc\u0631\u0627\u062a \u0627\u06cc\u0646 \u0631\u062f\u06cc\u0641 \u0644\u063a\u0648 \u0634\u0648\u062f\u061f",
      confirmDelete: "\u0628\u0627 \u062d\u0630\u0641 \u0627\u06cc\u0646 \u0627\u0645\u06a9\u0627\u0646\u060c \u0645\u0642\u062f\u0627\u0631\u0647\u0627\u06cc \u062b\u0628\u062a\u200c\u0634\u062f\u0647 \u0622\u0646 \u0647\u0645 \u062d\u0630\u0641 \u0645\u06cc\u200c\u0634\u0648\u062f. \u0627\u062f\u0627\u0645\u0647 \u0645\u06cc\u200c\u062f\u0647\u06cc\u062f\u061f",
      saveFailed: "\u0630\u062e\u06cc\u0631\u0647 \u0627\u0646\u062c\u0627\u0645 \u0646\u0634\u062f. \u0645\u0642\u0627\u062f\u06cc\u0631 \u0631\u0627 \u0628\u0631\u0631\u0633\u06cc \u06a9\u0646\u06cc\u062f.",
      deleteFailed: "\u062d\u0630\u0641 \u0627\u0646\u062c\u0627\u0645 \u0646\u0634\u062f.",
    };
  }

  return {
    add: "Add feature",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    discard: "Discard",
    keepEditing: "Keep editing",
    delete: "Delete",
    key: "Key",
    labelFa: "Label FA",
    labelEn: "Label EN",
    labelDe: "Label DE",
    type: "Type",
    sort: "Sort",
    active: "Active",
    inactive: "Inactive",
    values: "Used",
    actions: "Actions",
    enable: "Enable/disable",
    filter: "Filter",
    clear: "Clear",
    searchPlaceholder: "Search",
    required: "This field is required.",
    keyRule: "Use lowercase letters, numbers, and underscores only.",
    confirmCancel: "Discard changes to this row?",
    confirmDelete: "Deleting this feature also removes its saved values from businesses. Continue?",
    saveFailed: "Could not save. Please check the values.",
    deleteFailed: "Could not delete the feature.",
  };
}

function EditableCell({
  record,
  editing,
  dataIndex,
  cellTitle,
  inputType,
  required,
  keyField,
  selectOptions,
  children,
  ...restProps
}: React.PropsWithChildren<EditableCellProps>) {
  const locale = useLocale();
  const t = text(locale);

  function inputNode() {
    if (inputType === "number") return <InputNumber className="admin-input h-9 w-full rounded-lg text-sm font-bold" min={0} />;
    if (inputType === "switch") return <Switch />;
    if (inputType === "select") {
      return (
        <Select
          className="admin-ant-select w-full"
          popupClassName="admin-ant-select-dropdown"
          options={selectOptions}
          style={{ width: "100%" }}
        />
      );
    }
    if (inputType === "textarea") {
      return <Input.TextArea autoSize={{ minRows: 1, maxRows: 2 }} className="admin-input rounded-lg px-3 py-2 text-sm font-bold" aria-label={String(cellTitle)} />;
    }
    return <Input className="admin-input h-9 rounded-lg px-3 text-sm font-bold" aria-label={String(cellTitle)} />;
  }

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          initialValue={record[dataIndex]}
          valuePropName={inputType === "switch" ? "checked" : undefined}
          style={{ margin: 0 }}
          rules={[
            { required, message: t.required },
            ...(keyField ? [{ pattern: /^[a-z0-9_]+$/, message: t.keyRule }] : []),
          ]}
        >
          {inputNode()}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
}

function nullableString(value: unknown) {
  return value == null ? "" : String(value);
}

function attributeFormData(values: Partial<EditableAttributeRow>, id?: number) {
  const formData = new FormData();
  if (id) formData.append("id", String(id));
  formData.append("key", nullableString(values.key));
  formData.append("labelFa", nullableString(values.labelFa));
  formData.append("labelEn", nullableString(values.labelEn));
  formData.append("labelDe", nullableString(values.labelDe));
  formData.append("dataType", supportedDataType(values.dataType));
  formData.append("unit", "");
  formData.append("options", "");
  formData.append("sortOrder", nullableString(values.sortOrder ?? 0));
  formData.append("active", String(values.active ?? false));
  return formData;
}

function textSearch(value: unknown, source: unknown) {
  return String(source ?? "").toLowerCase().includes(String(value ?? "").toLowerCase());
}

export function AdminAttributesManager({ attributes }: { attributes: AdminAttributeDefinitionRow[] }) {
  const locale = useLocale();
  const router = useRouter();
  const t = text(locale);
  const [form] = Form.useForm<Partial<EditableAttributeRow>>();
  const [editingKey, setEditingKey] = useState("");
  const [adding, setAdding] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");

  const dataTypeOptions = useMemo(() => dataTypes.map((dataType) => ({ label: dataType, value: dataType })), []);
  const rows = useMemo<EditableAttributeRow[]>(() => {
    const currentRows = attributes.map((attribute) => ({
      ...attribute,
      dataType: supportedDataType(attribute.dataType),
      rowKey: String(attribute.id),
    }));
    return adding
      ? [{
        id: 0,
        rowKey: newRowKey,
        isNew: true,
        key: "",
        labelFa: "",
        labelEn: "",
        labelDe: "",
        dataType: "BOOLEAN",
        unit: "",
        options: "",
        sortOrder: 0,
        active: true,
        values: 0,
      }, ...currentRows]
      : currentRows;
  }, [adding, attributes]);

  const isEditing = (record: EditableAttributeRow) => record.rowKey === editingKey;

  function edit(record: EditableAttributeRow) {
    form.setFieldsValue({
      key: record.key,
      labelFa: record.labelFa,
      labelEn: record.labelEn ?? "",
      labelDe: record.labelDe ?? "",
      dataType: supportedDataType(record.dataType),
      sortOrder: record.sortOrder,
      active: record.active,
    });
    setError("");
    setEditingKey(record.rowKey);
  }

  function addRow() {
    setAdding(true);
    form.setFieldsValue({
      key: "",
      labelFa: "",
      labelEn: "",
      labelDe: "",
      dataType: "BOOLEAN",
      sortOrder: 0,
      active: true,
    });
    setError("");
    setEditingKey(newRowKey);
  }

  function cancel() {
    setEditingKey("");
    setAdding(false);
    setError("");
    form.resetFields();
  }

  async function save(record: EditableAttributeRow) {
    setError("");
    setSavingKey(record.rowKey);

    try {
      const values = await form.validateFields();
      if (record.isNew) await createAttributeDefinition(attributeFormData({ ...values, active: true }));
      else await updateAttributeDefinition(attributeFormData({ ...record, ...values }, record.id));
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

  async function remove(record: EditableAttributeRow) {
    setError("");
    setSavingKey(record.rowKey);
    const formData = new FormData();
    formData.append("id", String(record.id));

    try {
      await deleteAttributeDefinition(formData);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t.deleteFailed);
    } finally {
      setSavingKey("");
    }
  }

  async function toggleActive(record: EditableAttributeRow, active: boolean) {
    setError("");
    setSavingKey(record.rowKey);

    try {
      await updateAttributeDefinition(attributeFormData({ ...record, active }, record.id));
      router.refresh();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : t.saveFailed);
    } finally {
      setSavingKey("");
    }
  }

  function searchColumn(dataIndex: keyof Pick<EditableAttributeRow, "key" | "labelFa" | "labelEn" | "labelDe">) {
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
      onFilter: (value: boolean | React.Key, record: EditableAttributeRow) => textSearch(value, record[dataIndex]),
    };
  }

  const columns: EditableAttributeColumn[] = [
    {
      title: t.key,
      dataIndex: "key",
      width: 170,
      editable: true,
      editDataIndex: "key",
      required: true,
      keyField: true,
      inputType: "text",
      ellipsis: true,
      render: (key, record) => (
        <span className="inline-flex max-w-full items-center gap-2">
          <span className="truncate">{key}</span>
          <span className="inline-flex h-6 min-w-7 shrink-0 items-center justify-center rounded-full border border-white/10 px-2 text-[11px] font-black">{record.values}</span>
        </span>
      ),
      ...searchColumn("key"),
    },
    { title: t.labelFa, dataIndex: "labelFa", width: 150, editable: true, editDataIndex: "labelFa", required: true, inputType: "text", ellipsis: true, ...searchColumn("labelFa") },
    { title: t.labelEn, dataIndex: "labelEn", width: 135, editable: true, editDataIndex: "labelEn", inputType: "text", ellipsis: true, ...searchColumn("labelEn") },
    { title: t.labelDe, dataIndex: "labelDe", width: 135, editable: true, editDataIndex: "labelDe", inputType: "text", ellipsis: true, ...searchColumn("labelDe") },
    {
      title: t.type,
      dataIndex: "dataType",
      width: 115,
      editable: true,
      editDataIndex: "dataType",
      required: true,
      inputType: "select",
      selectOptions: dataTypeOptions,
      filters: dataTypes.map((dataType) => ({ text: dataType, value: dataType })),
      onFilter: (value, record) => record.dataType === value,
    },
    { title: t.sort, dataIndex: "sortOrder", width: 65, editable: true, editDataIndex: "sortOrder", inputType: "number", sorter: (a, b) => a.sortOrder - b.sortOrder },
    {
      title: t.actions,
      key: "actions",
      width: 132,
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <Space size="small">
            <Tooltip title={t.save}>
              <Button size="small" type="primary" icon={<FiCheck />} disabled={savingKey === record.rowKey} onClick={() => save(record)} />
            </Tooltip>
            <Popconfirm title={t.confirmCancel} okText={t.discard} cancelText={t.keepEditing} onConfirm={cancel}>
              <Tooltip title={t.cancel}>
                <Button size="small" icon={<FiX />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        ) : (
          <Space size="small">
            <Tooltip title={t.enable}>
              <Switch checked={record.active} size="small" disabled={editingKey !== "" || savingKey === record.rowKey} onChange={(checked) => toggleActive(record, checked)} />
            </Tooltip>
            <Tooltip title={t.edit}>
              <Button size="small" icon={<FiEdit2 />} disabled={editingKey !== ""} onClick={() => edit(record)} />
            </Tooltip>
            <Popconfirm title={t.confirmDelete} okText={t.delete} cancelText={t.cancel} onConfirm={() => remove(record)}>
              <Tooltip title={t.delete}>
                <Button size="small" danger icon={<FiTrash2 />} disabled={editingKey !== ""} />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const mergedColumns: TableProps<EditableAttributeRow>["columns"] = columns.map((column) => {
    if (!column.editable || !column.editDataIndex || !column.inputType) return column;

    return {
      ...column,
      onCell: (record: EditableAttributeRow) => ({
        record,
        editing: isEditing(record),
        dataIndex: column.editDataIndex,
        cellTitle: column.title,
        inputType: column.inputType,
        required: column.required,
        keyField: column.keyField,
        selectOptions: column.selectOptions,
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
          <Table<EditableAttributeRow>
            rowKey="rowKey"
            className="admin-ant-table"
            components={{ body: { cell: EditableCell } }}
            columns={mergedColumns}
            dataSource={rows}
            size="middle"
            bordered
            tableLayout="fixed"
            scroll={{ x: 902 }}
            pagination={{ pageSize: 10, onChange: cancel }}
            getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
          />
        </Form>
      </div>
    </ConfigProvider>
  );
}
