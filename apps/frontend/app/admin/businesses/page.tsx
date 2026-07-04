import { getTranslations } from "next-intl/server";
import { Fragment } from "react";
import { AdminButton, AdminSection, AdminTable, StatusBadge, tableClassName, tdClassName, thClassName } from "@/components/admin/AdminPrimitives";
import { Link } from "@/i18n/navigation";
import { setBusinessFlag, setBusinessStatus, updateBusinessDetails } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 15;
const statuses = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED", "REJECTED"] as const;
const locales = ["DE", "EN", "FA"] as const;
const inputClassName = "admin-input h-10 rounded-lg px-3 text-sm outline-none focus:border-sky-400";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminBusinessesPage({ searchParams }: PageProps) {
  const [params, t] = await Promise.all([searchParams, getTranslations("Admin")]);
  const page = positiveInt(first(params.page));
  const status = first(params.status);
  const categoryId = positiveInt(first(params.categoryId));
  const cityId = positiveInt(first(params.cityId));
  const q = first(params.q)?.trim();
  const where = {
    ...(statuses.includes(status as (typeof statuses)[number]) && { status: status as (typeof statuses)[number] }),
    ...(categoryId > 0 && { categoryId }),
    ...(cityId > 0 && { cityId }),
    ...(q && {
      OR: [
        { businessName: { contains: q, mode: "insensitive" as const } },
        { slug: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
      ],
    }),
  };

  const [businesses, total, categories, subCategories, specialties, cities] = await Promise.all([
    prisma.business.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: { select: { id: true, nameEn: true, nameFa: true } },
        subCategory: { select: { id: true, nameEn: true, nameFa: true } },
        city: { select: { id: true, nameEn: true, nameFa: true } },
        owner: { select: { email: true, name: true } },
        translations: true,
      },
    }),
    prisma.business.count({ where }),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true, nameFa: true } }),
    prisma.subCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true, nameFa: true, categoryId: true } }),
    prisma.specialty.findMany({ orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }], select: { id: true, nameFa: true, nameEn: true, subCategoryId: true } }),
    prisma.city.findMany({ orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true, nameFa: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageQuery = new URLSearchParams();
  if (status) pageQuery.set("status", status);
  if (q) pageQuery.set("q", q);
  if (categoryId > 0) pageQuery.set("categoryId", String(categoryId));
  if (cityId > 0) pageQuery.set("cityId", String(cityId));
  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams(pageQuery);
    query.set("page", String(nextPage));
    return `/admin/businesses?${query.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">{t("businesses.title")}</h1>
        <p className="mt-2 text-slate-400">{t("businesses.description")}</p>
      </div>

      <AdminSection title={t("filters.title")}>
        <form className="grid gap-3 md:grid-cols-[1fr_220px_220px_220px_auto]" method="get">
          <input name="q" defaultValue={q} placeholder={t("filters.search")} className="admin-input h-11 rounded-lg px-4 outline-none focus:border-sky-400" />
          <select name="categoryId" defaultValue={categoryId > 0 ? String(categoryId) : ""} className="admin-input h-11 rounded-lg px-4 outline-none focus:border-sky-400">
            <option value="">{t("filters.allCategories")}</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.nameEn} / {item.nameFa}</option>)}
          </select>
          <select name="cityId" defaultValue={cityId > 0 ? String(cityId) : ""} className="admin-input h-11 rounded-lg px-4 outline-none focus:border-sky-400">
            <option value="">{t("filters.allCities")}</option>
            {cities.map((item) => <option key={item.id} value={item.id}>{item.nameEn} / {item.nameFa}</option>)}
          </select>
          <select name="status" defaultValue={status ?? ""} className="admin-input h-11 rounded-lg px-4 outline-none focus:border-sky-400">
            <option value="">{t("filters.allStatuses")}</option>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <AdminButton>{t("actions.filter")}</AdminButton>
        </form>
      </AdminSection>

      <AdminSection title={t("businesses.list")} description={t("pagination.summary", { total, page, totalPages })}>
        <AdminTable>
          <table className={tableClassName}>
            <thead>
              <tr>
                <th className={thClassName}>{t("fields.business")}</th>
                <th className={thClassName}>{t("fields.owner")}</th>
                <th className={thClassName}>{t("fields.category")}</th>
                <th className={thClassName}>{t("fields.status")}</th>
                <th className={thClassName}>{t("fields.flags")}</th>
                <th className={thClassName}>{t("fields.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {businesses.map((business) => {
                const translations = new Map(business.translations.map((translation) => [translation.locale, translation]));
                translations.set(business.sourceLocale, {
                  id: `${business.id}-${business.sourceLocale}`,
                  businessId: business.id,
                  locale: business.sourceLocale,
                  businessName: business.businessName,
                  shortDescription: business.shortDescription,
                  description: business.description,
                  createdAt: business.createdAt,
                  updatedAt: business.updatedAt,
                });

                return (
                  <Fragment key={business.id}>
                  <tr id={business.id}>
                    <td className={tdClassName}>
                      <div className="font-black text-white">{business.businessName}</div>
                      <div className="mt-1 text-xs text-slate-400">{business.slug}</div>
                    </td>
                    <td className={tdClassName}>{business.owner?.name || business.owner?.email || "-"}</td>
                    <td className={tdClassName}>{business.category.nameEn}<br /><span className="text-xs text-slate-500">{business.city.nameEn}</span></td>
                    <td className={tdClassName}><StatusBadge status={business.status} /></td>
                    <td className={tdClassName}>
                      <div className="flex flex-wrap gap-2">
                        <form action={setBusinessFlag}>
                          <input type="hidden" name="businessId" value={business.id} />
                          <input type="hidden" name="field" value="verified" />
                          <input type="hidden" name="enabled" value={String(!business.verified)} />
                          <AdminButton>{business.verified ? t("actions.unverify") : t("actions.verify")}</AdminButton>
                        </form>
                        <form action={setBusinessFlag}>
                          <input type="hidden" name="businessId" value={business.id} />
                          <input type="hidden" name="field" value="featured" />
                          <input type="hidden" name="enabled" value={String(!business.featured)} />
                          <AdminButton>{business.featured ? t("actions.unfeature") : t("actions.feature")}</AdminButton>
                        </form>
                      </div>
                    </td>
                    <td className={tdClassName}>
                      <div className="grid min-w-[190px] gap-2">
                        <form action={setBusinessStatus} className="grid gap-2">
                          <input type="hidden" name="businessId" value={business.id} />
                          <select name="status" defaultValue={business.status} className={inputClassName}>
                            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                          <AdminButton tone="success">{t("actions.apply")}</AdminButton>
                        </form>
                        <Link href={`/businesses/${business.slug}`} className="rounded-lg border border-white/10 px-3 py-2 text-center text-xs font-black text-slate-200 hover:bg-white/8">{t("actions.viewPublic")}</Link>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="px-4 pb-6 pt-0">
                      <details className="admin-field-panel rounded-lg border p-5">
                        <summary className="cursor-pointer text-sm font-black text-sky-200">{t("businesses.editDetails")}</summary>
                        <form action={updateBusinessDetails} className="mt-5 grid gap-5">
                          <input type="hidden" name="businessId" value={business.id} />
                          <div className="grid gap-4 md:grid-cols-3">
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.slug")}<input name="slug" defaultValue={business.slug} className={inputClassName} /></label>
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.legalName")}<input name="legalName" defaultValue={business.legalName ?? ""} className={inputClassName} /></label>
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.sourceLocale")}<select name="sourceLocale" defaultValue={business.sourceLocale} className={inputClassName}>{locales.map((locale) => <option key={locale} value={locale}>{locale}</option>)}</select></label>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.category")}<select name="categoryId" defaultValue={business.categoryId} className={inputClassName}>{categories.map((item) => <option key={item.id} value={item.id}>{item.nameEn} / {item.nameFa}</option>)}</select></label>
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.subCategory")}<select name="subCategoryId" defaultValue={business.subCategoryId ?? ""} className={inputClassName}><option value="">-</option>{subCategories.map((item) => <option key={item.id} value={item.id}>{item.nameEn} / {item.nameFa}</option>)}</select></label>
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.specialty")}<select name="specialtyId" defaultValue={business.specialtyId ?? ""} className={inputClassName}><option value="">-</option>{specialties.map((item) => <option key={item.id} value={item.id}>{item.nameEn || item.nameFa}</option>)}</select></label>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.city")}<select name="cityId" defaultValue={business.cityId} className={inputClassName}>{cities.map((item) => <option key={item.id} value={item.id}>{item.nameEn} / {item.nameFa}</option>)}</select></label>
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.status")}<select name="status" defaultValue={business.status} className={inputClassName}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.verified")}<select name="verified" defaultValue={String(business.verified)} className={inputClassName}><option value="true">{t("common.yes")}</option><option value="false">{t("common.no")}</option></select></label>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.featured")}<select name="featured" defaultValue={String(business.featured)} className={inputClassName}><option value="true">{t("common.yes")}</option><option value="false">{t("common.no")}</option></select></label>
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.email")}<input name="email" defaultValue={business.email ?? ""} className={inputClassName} /></label>
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.phone")}<input name="phone" defaultValue={business.phone ?? ""} className={inputClassName} /></label>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.mobile")}<input name="mobile" defaultValue={business.mobile ?? ""} className={inputClassName} /></label>
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.website")}<input name="website" defaultValue={business.website ?? ""} className={inputClassName} /></label>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.address")}<input name="address" defaultValue={business.address ?? ""} className={inputClassName} /></label>
                            <label className="grid gap-2 text-xs font-bold text-slate-300">{t("fields.postalCode")}<input name="postalCode" defaultValue={business.postalCode ?? ""} className={inputClassName} /></label>
                          </div>
                          <div className="grid gap-4">
                            {locales.map((locale) => {
                              const translation = translations.get(locale);
                              return (
                                <fieldset key={locale} className="admin-field-panel rounded-lg border p-4">
                                  <legend className="px-2 text-xs font-black text-sky-200">{locale}</legend>
                                  <div className="grid gap-3">
                                    <input name={`businessName_${locale}`} defaultValue={translation?.businessName ?? ""} placeholder={t("fields.businessName")} className={inputClassName} />
                                    <input name={`shortDescription_${locale}`} defaultValue={translation?.shortDescription ?? ""} placeholder={t("fields.shortDescription")} className={inputClassName} />
                                    <textarea name={`description_${locale}`} defaultValue={translation?.description ?? ""} placeholder={t("fields.description")} rows={3} className="admin-input rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400" />
                                  </div>
                                </fieldset>
                              );
                            })}
                          </div>
                          <div><AdminButton tone="success">{t("actions.save")}</AdminButton></div>
                        </form>
                      </details>
                    </td>
                  </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </AdminTable>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <span>{t("pagination.summary", { total, page, totalPages })}</span>
          <div className="flex gap-2">
            <Link href={pageHref(Math.max(1, page - 1))} className="rounded-lg border border-white/10 px-3 py-2 font-bold text-white">{t("pagination.previous")}</Link>
            <Link href={pageHref(Math.min(totalPages, page + 1))} className="rounded-lg border border-white/10 px-3 py-2 font-bold text-white">{t("pagination.next")}</Link>
          </div>
        </div>
      </AdminSection>
    </div>
  );
}
