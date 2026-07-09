"use client";

import { ConfigProvider, Select } from "antd";
import { useState } from "react";
import { useLocale } from "next-intl";

type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  name: string;
  options: SelectOption[];
  defaultValue?: string | number | null;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
  onValueChange?: (name: string, value: string) => void;
};

type MultiProps = {
  name: string;
  options: SelectOption[];
  defaultValue?: Array<string | number> | null;
  placeholder?: string;
  className?: string;
  onValueChange?: (name: string, value: string[]) => void;
};

export function AdminSearchSelect({
  name,
  options,
  defaultValue,
  placeholder,
  allowClear = false,
  className,
  onValueChange,
}: Props) {
  const locale = useLocale();
  const defaultString = defaultValue === null || defaultValue === undefined ? "" : String(defaultValue);
  const [selection, setSelection] = useState({ defaultString, value: defaultString });
  const value = selection.defaultString === defaultString ? selection.value : defaultString;

  return (
    <ConfigProvider direction={locale === "fa" ? "rtl" : "ltr"}>
      <input type="hidden" name={name} value={value} />
      <Select
        showSearch
        allowClear={allowClear}
        value={value || undefined}
        placeholder={placeholder}
        options={options.map((option) => ({ ...option, value: String(option.value) }))}
        className={["admin-ant-select", className].filter(Boolean).join(" ")}
        popupClassName="admin-ant-select-dropdown"
        optionFilterProp="label"
        filterOption={(input, option) => String(option?.label ?? "").toLocaleLowerCase().includes(input.toLocaleLowerCase())}
        getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
        onChange={(nextValue) => {
          const normalizedValue = nextValue ?? "";
          setSelection({ defaultString, value: normalizedValue });
          onValueChange?.(name, normalizedValue);
        }}
      />
    </ConfigProvider>
  );
}

export function AdminMultiSelect({
  name,
  options,
  defaultValue,
  placeholder,
  className,
  onValueChange,
}: MultiProps) {
  const locale = useLocale();
  const defaultValues = (defaultValue ?? []).map(String);
  const defaultKey = defaultValues.join("\u001f");
  const [selection, setSelection] = useState({ defaultKey, value: defaultValues });
  const value = selection.defaultKey === defaultKey ? selection.value : defaultValues;

  return (
    <ConfigProvider direction={locale === "fa" ? "rtl" : "ltr"}>
      {value.map((item) => <input key={item} type="hidden" name={name} value={item} />)}
      <Select
        mode="multiple"
        allowClear
        showSearch
        value={value}
        placeholder={placeholder}
        options={options.map((option) => ({ ...option, value: String(option.value) }))}
        className={["admin-ant-select", className].filter(Boolean).join(" ")}
        popupClassName="admin-ant-select-dropdown"
        optionFilterProp="label"
        maxTagCount="responsive"
        filterOption={(input, option) => String(option?.label ?? "").toLocaleLowerCase().includes(input.toLocaleLowerCase())}
        getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
        onChange={(nextValue) => {
          const normalizedValue = nextValue.map(String);
          setSelection({ defaultKey, value: normalizedValue });
          onValueChange?.(name, normalizedValue);
        }}
      />
    </ConfigProvider>
  );
}
