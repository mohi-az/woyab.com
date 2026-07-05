"use client";

import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/AdminPrimitives";
import { AdminSearchSelect } from "@/components/admin/AdminSearchSelect";

type Option = {
  id: number;
  nameEn: string | null;
  nameFa: string | null;
};

type Props = {
  q?: string;
  categoryId: number | null;
  cityId: number | null;
  status: string | null;
  categories: Option[];
  cities: Option[];
  statuses: readonly string[];
};

function optionLabel(option: Option) {
  return [option.nameEn, option.nameFa].filter(Boolean).join(" / ");
}

export function AdminBusinessFilters({ q, categoryId, cityId, status, categories, cities, statuses }: Props) {
  const t = useTranslations("Admin");

  return (
    <form className="grid gap-3 md:grid-cols-[1fr_240px_240px_180px_auto]" method="get">
      <input name="q" defaultValue={q} placeholder={t("filters.search")} className="admin-input h-11 rounded-lg px-4 outline-none focus:border-sky-400" />
      <AdminSearchSelect
        name="categoryId"
        defaultValue={categoryId}
        allowClear
        placeholder={t("filters.allCategories")}
        options={categories.map((item) => ({ value: String(item.id), label: optionLabel(item) }))}
      />
      <AdminSearchSelect
        name="cityId"
        defaultValue={cityId}
        allowClear
        placeholder={t("filters.allCities")}
        options={cities.map((item) => ({ value: String(item.id), label: optionLabel(item) }))}
      />
      <select name="status" defaultValue={status ?? ""} className="admin-input h-11 rounded-lg px-4 outline-none focus:border-sky-400">
        <option value="">{t("filters.allStatuses")}</option>
        {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <AdminButton>{t("actions.filter")}</AdminButton>
    </form>
  );
}
