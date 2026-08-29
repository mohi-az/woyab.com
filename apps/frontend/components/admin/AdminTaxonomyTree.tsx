"use client";

import { ConfigProvider, Select, Switch, Tree } from "antd";
import type { DataNode } from "antd/es/tree";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { FiSave } from "react-icons/fi";
import { DynamicIcon, dynamicIconOptions } from "@/components/icons/DynamicIcon";
import { updateCategory, updateSubCategory } from "@/lib/admin-actions";
import { AdminButton } from "@/components/admin/AdminPrimitives";

type SubCategoryRow = {
  id: number;
  nameFa: string;
  nameEn: string;
  nameDe: string;
  slug: string;
  icon: string | null;
  categoryId: number;
  sortOrder: number;
  active: boolean;
  businesses: number;
};

export type CategoryTreeRow = {
  id: number;
  nameFa: string;
  nameEn: string;
  nameDe: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
  active: boolean;
  businesses: number;
  subCategories: SubCategoryRow[];
};

type SelectedNode =
  | { type: "category"; item: CategoryTreeRow }
  | { type: "subCategory"; item: SubCategoryRow; parent: CategoryTreeRow };

const fieldClassName = "admin-input h-10 min-w-0 rounded-lg px-3 text-sm font-bold outline-none focus:border-sky-400";

function boolValue(value: boolean) {
  return value ? "true" : "false";
}

function IconSelect({ name, defaultValue, formId }: { name: string; defaultValue?: string | null; formId: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const options = useMemo(() => dynamicIconOptions.map((item) => ({
    value: item.key,
    search: `${item.label} ${item.key} ${item.library}`,
    label: (
      <span className="flex items-center gap-2">
        <DynamicIcon iconKey={item.key} className="text-lg text-primary" />
        <span>{item.label}</span>
        <span className="ms-auto rounded bg-slate-500/10 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">{item.library}</span>
      </span>
    ),
  })), []);

  return (
    <>
      <input form={formId} type="hidden" name={name} value={value} />
      <Select
        showSearch
        allowClear
        value={value || undefined}
        options={options}
        optionFilterProp="search"
        className="admin-ant-select"
        popupClassName="admin-ant-select-dropdown"
        getPopupContainer={() => document.body}
        onChange={(next) => setValue(next ?? "")}
      />
    </>
  );
}

function ActiveSwitch({ formId, defaultChecked }: { formId: string; defaultChecked: boolean }) {
  const t = useTranslations("Admin");
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center gap-2">
      <input form={formId} type="hidden" name="active" value={boolValue(checked)} />
      <Switch checked={checked} onChange={setChecked} checkedChildren={t("common.active")} unCheckedChildren={t("common.inactive")} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="admin-muted text-xs font-black">{label}</span>
      {children}
    </label>
  );
}

function NodeTitle({ icon, title, meta, active }: { icon: React.ReactNode; title: string; meta: string; active: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-3 py-1">
      <span className="admin-icon-button grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-base">{icon}</span>
      <span className="min-w-0">
        <span className="admin-title block truncate text-sm font-black">{title}</span>
        <span className="admin-muted block truncate text-xs">{meta}</span>
      </span>
      {!active ? <span className="rounded-full bg-rose-400/12 px-2 py-0.5 text-[10px] font-black text-rose-300">OFF</span> : null}
    </span>
  );
}

export function AdminTaxonomyTree({ categories }: { categories: CategoryTreeRow[] }) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const [selectedKey, setSelectedKey] = useState<string>(categories[0] ? `category:${categories[0].id}` : "");
  const localizedName = (item: { nameFa: string; nameEn: string; nameDe: string }) =>
    locale === "fa" ? item.nameFa : locale === "de" ? item.nameDe || item.nameEn : item.nameEn;
  const alternateNames = (item: { nameFa: string; nameEn: string; nameDe: string }) =>
    [item.nameDe, item.nameEn, item.nameFa].filter((name, index, names) => name && names.indexOf(name) === index).join(" / ");

  let selected: SelectedNode | null = null;
  for (const category of categories) {
    if (selectedKey === `category:${category.id}`) selected = { type: "category", item: category };
    for (const subCategory of category.subCategories) {
      if (selectedKey === `subCategory:${subCategory.id}`) selected = { type: "subCategory", item: subCategory, parent: category };
    }
  }

  const treeData: DataNode[] = categories.map((category) => ({
    key: `category:${category.id}`,
    title: (
      <NodeTitle
        icon={<DynamicIcon iconKey={category.icon} />}
        title={localizedName(category)}
        meta={`${alternateNames(category)} / ${t("taxonomy.categoryCounts", { businesses: category.businesses, children: category.subCategories.length })}`}
        active={category.active}
      />
    ),
    children: category.subCategories.map((subCategory) => ({
      key: `subCategory:${subCategory.id}`,
      title: (
        <NodeTitle
          icon={<DynamicIcon iconKey={subCategory.icon ?? category.icon} />}
          title={localizedName(subCategory)}
          meta={`${alternateNames(subCategory)} / ${subCategory.businesses} listings`}
          active={subCategory.active}
        />
      ),
    })),
  }));

  const formId = selected ? `${selected.type}-${selected.item.id}` : "taxonomy-empty";
  const action = selected?.type === "category" ? updateCategory : updateSubCategory;
  const title = selected?.type === "category"
    ? localizedName(selected.item)
    : selected ? localizedName(selected.item) : "";

  return (
    <ConfigProvider direction={locale === "fa" ? "rtl" : "ltr"}>
      <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(520px,1.1fr)]">
        <div className="admin-taxonomy-tree rounded-lg border p-3">
          <Tree
            showLine
            blockNode
            selectedKeys={selectedKey ? [selectedKey] : []}
            treeData={treeData}
            onSelect={(keys) => setSelectedKey(String(keys[0] ?? selectedKey))}
          />
        </div>

        <div className="admin-field-panel rounded-lg border p-5">
          {selected ? (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="admin-icon-button grid h-11 w-11 place-items-center rounded-lg border text-xl">
                    {selected.type === "category" ? <DynamicIcon iconKey={selected.item.icon} /> : <DynamicIcon iconKey={selected.item.icon ?? selected.parent.icon} />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="admin-title truncate text-xl font-black">{title}</h3>
                    <p className="admin-muted text-xs font-bold uppercase">{selected.type}</p>
                  </div>
                </div>
              </div>

              <form id={formId} action={action} className="grid gap-4">
                <input type="hidden" name="id" value={selected.item.id} />
                {selected.type === "subCategory" ? <input type="hidden" name="categoryId" value={selected.item.categoryId} /> : null}

                <div className="grid gap-4 md:grid-cols-3">
                  <Field label={`${t("fields.name")} EN`}>
                    <input name="nameEn" defaultValue={selected.item.nameEn ?? ""} required className={fieldClassName} />
                  </Field>
                  <Field label={`${t("fields.name")} DE`}>
                    <input name="nameDe" defaultValue={selected.item.nameDe ?? ""} required className={fieldClassName} />
                  </Field>
                  <Field label={`${t("fields.name")} FA`}>
                    <input name="nameFa" defaultValue={selected.item.nameFa} required className={fieldClassName} />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t("fields.slug")}>
                    <input name="slug" defaultValue={selected.item.slug} className={fieldClassName} />
                  </Field>
                  <Field label={t("fields.icon")}>
                    <IconSelect formId={formId} name="icon" defaultValue={selected.item.icon} />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t("fields.sort")}>
                    <input name="sortOrder" defaultValue={selected.item.sortOrder} className={fieldClassName} />
                  </Field>
                  <Field label={t("fields.status")}>
                    <ActiveSwitch formId={formId} defaultChecked={selected.item.active} />
                  </Field>
                </div>

                <div className="flex justify-end">
                  <AdminButton tone="success" className="admin-primary-action inline-flex items-center gap-2 px-5 py-2.5 text-sm shadow-lg">
                    <FiSave /> {t("actions.save")}
                  </AdminButton>
                </div>
              </form>
            </>
          ) : (
            <p className="admin-muted text-sm">{t("empty.noReports")}</p>
          )}
        </div>
      </div>
    </ConfigProvider>
  );
}
