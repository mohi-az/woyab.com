"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { AdminMultiSelect } from "@/components/admin/AdminSearchSelect";
import { businessTagLabel, type BusinessTagOption, type BusinessTagValue } from "@/lib/business-tags";

type Props = {
  tags: BusinessTagOption[];
  values?: BusinessTagValue[];
  variant?: "admin" | "owner";
  onSelectionChange?: (labels: string[]) => void;
};

export function BusinessTagFields({ tags, values = [], variant = "owner", onSelectionChange }: Props) {
  const locale = useLocale();
  const selected = new Set(values.map((item) => item.tagId));
  const selectedValues = values.map((item) => item.tagId);
  const [selectedIds, setSelectedIds] = useState(() => new Set(selectedValues));
  const checkboxClassName = variant === "admin"
    ? "h-4 w-4 rounded border-white/20 bg-transparent text-sky-400 focus:ring-sky-400"
    : "h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary";
  const itemClassName = variant === "admin"
    ? "flex min-h-11 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm font-bold text-white"
    : "flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700";

  if (!tags.length) return null;

  function updateSelection(tagId: number, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) next.add(tagId);
    else next.delete(tagId);
    setSelectedIds(next);
    onSelectionChange?.(
      tags.filter((tag) => next.has(tag.id)).map((tag) => businessTagLabel(tag, locale)),
    );
  }

  if (variant === "admin") {
    return (
      <AdminMultiSelect
        name="tagIds"
        defaultValue={selectedValues}
        placeholder={locale === "fa" ? "محصولات، خدمات و حوزه‌های فعالیت" : locale === "de" ? "Produkte und Dienstleistungen" : "Products and services"}
        options={tags.map((tag) => ({ value: String(tag.id), label: businessTagLabel(tag, locale) }))}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tags.map((tag) => (
        <label key={tag.id} className={itemClassName}>
          <input
            name="tagIds"
            type="checkbox"
            value={tag.id}
            defaultChecked={selected.has(tag.id)}
            onChange={(event) => updateSelection(tag.id, event.target.checked)}
            className={checkboxClassName}
          />
          <span>{businessTagLabel(tag, locale)}</span>
        </label>
      ))}
    </div>
  );
}
