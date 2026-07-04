import { getTranslations } from "next-intl/server";
import { AdminButton, AdminSection, StatusBadge } from "@/components/admin/AdminPrimitives";
import { updateCategory, updateSpecialty, updateSubCategory } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

const fieldClassName = "admin-input h-10 min-w-0 rounded-lg px-3 text-sm outline-none focus:border-sky-400";

export default async function AdminTaxonomyPage() {
  const [t, categories, subCategories, specialties] = await Promise.all([
    getTranslations("Admin"),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      include: { _count: { select: { businesses: true, subCategories: true } } },
    }),
    prisma.subCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      include: { category: { select: { nameEn: true } }, _count: { select: { businesses: true, specialties: true } } },
    }),
    prisma.specialty.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
      include: { subCategory: { select: { nameEn: true } }, _count: { select: { businesses: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">{t("taxonomy.title")}</h1>
        <p className="mt-2 text-slate-400">{t("taxonomy.description")}</p>
      </div>

      <AdminSection title={t("taxonomy.categories")} description={t("taxonomy.categoryCounts", { businesses: categories.reduce((sum, item) => sum + item._count.businesses, 0), children: subCategories.length })}>
        <div className="grid gap-4 xl:grid-cols-2">
          {categories.map((category) => (
            <form key={category.id} action={updateCategory} className="admin-field-panel rounded-lg border p-4">
              <input type="hidden" name="id" value={category.id} />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-white">{category.nameEn}</h3>
                    <StatusBadge status={category.active ? "ACTIVE" : "SUSPENDED"} />
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{category.nameFa}</p>
                </div>
                <div className="text-end text-xs font-bold text-slate-400">
                  {t("taxonomy.categoryCounts", { businesses: category._count.businesses, children: category._count.subCategories })}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-xs font-bold text-slate-300">{t("fields.name")} EN<input name="nameEn" defaultValue={category.nameEn} className={fieldClassName} /></label>
                <label className="grid gap-1 text-xs font-bold text-slate-300">{t("fields.name")} FA<input name="nameFa" defaultValue={category.nameFa} className={fieldClassName} /></label>
                <label className="grid gap-1 text-xs font-bold text-slate-300">{t("fields.slug")}<input name="slug" defaultValue={category.slug} className={fieldClassName} /></label>
                <label className="grid gap-1 text-xs font-bold text-slate-300">{t("fields.icon")}<input name="icon" defaultValue={category.icon ?? ""} className={fieldClassName} /></label>
                <label className="grid gap-1 text-xs font-bold text-slate-300">{t("fields.sort")}<input name="sortOrder" defaultValue={category.sortOrder} className={fieldClassName} /></label>
                <label className="grid gap-1 text-xs font-bold text-slate-300">{t("fields.status")}<select name="active" defaultValue={String(category.active)} className={fieldClassName}><option value="true">{t("common.active")}</option><option value="false">{t("common.inactive")}</option></select></label>
              </div>

              <div className="mt-4 flex justify-end">
                <AdminButton tone="success">{t("actions.save")}</AdminButton>
              </div>
            </form>
          ))}
        </div>
      </AdminSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSection title={t("taxonomy.subCategories")} description={`${subCategories.length}`}>
          <div className="grid gap-3">
            {subCategories.map((item) => (
              <form key={item.id} action={updateSubCategory} className="admin-field-panel rounded-lg border p-4">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="categoryId" value={item.categoryId} />
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong className="text-white">{item.nameEn}</strong>
                    <p className="mt-1 text-xs text-slate-400">{item.category.nameEn} / {item._count.businesses} listings / {item._count.specialties} specialties</p>
                  </div>
                  <StatusBadge status={item.active ? "ACTIVE" : "SUSPENDED"} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input name="nameEn" defaultValue={item.nameEn} className={fieldClassName} />
                  <input name="nameFa" defaultValue={item.nameFa} className={fieldClassName} />
                  <input name="slug" defaultValue={item.slug} className={fieldClassName} />
                  <input name="sortOrder" defaultValue={item.sortOrder} className={fieldClassName} />
                  <select name="active" defaultValue={String(item.active)} className={fieldClassName}><option value="true">{t("common.active")}</option><option value="false">{t("common.inactive")}</option></select>
                  <AdminButton tone="success">{t("actions.save")}</AdminButton>
                </div>
              </form>
            ))}
          </div>
        </AdminSection>

        <AdminSection title={t("taxonomy.specialties")} description={`${specialties.length}`}>
          <div className="grid gap-3">
            {specialties.map((item) => (
              <form key={item.id} action={updateSpecialty} className="admin-field-panel rounded-lg border p-4">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="subCategoryId" value={item.subCategoryId} />
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong className="text-white">{item.nameEn || item.nameFa}</strong>
                    <p className="mt-1 text-xs text-slate-400">{item.subCategory.nameEn} / {item._count.businesses} listings</p>
                  </div>
                  <StatusBadge status={item.active ? "ACTIVE" : "SUSPENDED"} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input name="nameFa" defaultValue={item.nameFa} className={fieldClassName} />
                  <input name="nameEn" defaultValue={item.nameEn ?? ""} className={fieldClassName} />
                  <input name="sortOrder" defaultValue={item.sortOrder} className={fieldClassName} />
                  <select name="active" defaultValue={String(item.active)} className={fieldClassName}><option value="true">{t("common.active")}</option><option value="false">{t("common.inactive")}</option></select>
                  <div className="md:col-span-2"><AdminButton tone="success">{t("actions.save")}</AdminButton></div>
                </div>
              </form>
            ))}
          </div>
        </AdminSection>
      </div>
    </div>
  );
}
