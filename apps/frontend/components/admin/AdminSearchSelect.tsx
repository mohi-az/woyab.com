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
  const [value, setValue] = useState(defaultValue === null || defaultValue === undefined ? "" : String(defaultValue));

  return (
    <ConfigProvider direction={locale === "fa" ? "rtl" : "ltr"}>
      <input type="hidden" name={name} value={value} />
      <Select
        showSearch
        allowClear={allowClear}
        value={value || undefined}
        placeholder={placeholder}
        options={options}
        className={["admin-ant-select", className].filter(Boolean).join(" ")}
        popupClassName="admin-ant-select-dropdown"
        optionFilterProp="label"
        filterOption={(input, option) => String(option?.label ?? "").toLocaleLowerCase().includes(input.toLocaleLowerCase())}
        getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
        onChange={(nextValue) => {
          const normalizedValue = nextValue ?? "";
          setValue(normalizedValue);
          onValueChange?.(name, normalizedValue);
        }}
      />
    </ConfigProvider>
  );
}
