import { getLocale, getTranslations } from "next-intl/server";
import { AdminAttributesManager, type AdminAttributeDefinitionRow } from "@/components/admin/AdminAttributesManager";
import { AdminTagsManager, type AdminTagRow } from "@/components/admin/AdminTagsManager";
import { AdminTaxonomyTree, type CategoryTreeRow } from "@/components/admin/AdminTaxonomyTree";
import { AdminSection } from "@/components/admin/AdminPrimitives";
import { prisma } from "@/lib/prisma";

export default async function AdminTaxonomyPage() {
  const [t, locale, categories, tags, attributes] = await Promise.all([
    getTranslations("Admin"),
    getLocale(),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      include: {
        _count: { select: { businesses: true } },
        subCategories: {
          orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
          include: {
            _count: { select: { businesses: true } },
          },
        },
      },
    }),
    prisma.tag.findMany({
      orderBy: [{ nameEn: "asc" }, { nameFa: "asc" }],
      include: { _count: { select: { businesses: true } } },
    }),
    prisma.attributeDefinition.findMany({
      orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }, { labelFa: "asc" }],
      select: {
        id: true,
        key: true,
        labelFa: true,
        labelEn: true,
        labelDe: true,
        dataType: true,
        unit: true,
        options: true,
        sortOrder: true,
        active: true,
        _count: { select: { values: true } },
      },
    }),
  ]);

  const treeRows: CategoryTreeRow[] = categories.map((category) => ({
    id: category.id,
    nameFa: category.nameFa,
    nameEn: category.nameEn,
    nameDe: category.nameDe,
    slug: category.slug,
    icon: category.icon,
    sortOrder: category.sortOrder,
    active: category.active,
    businesses: category._count.businesses,
    subCategories: category.subCategories.map((subCategory) => ({
      id: subCategory.id,
      nameFa: subCategory.nameFa,
      nameEn: subCategory.nameEn,
      nameDe: subCategory.nameDe,
      slug: subCategory.slug,
      icon: subCategory.icon,
      categoryId: subCategory.categoryId,
      sortOrder: subCategory.sortOrder,
      active: subCategory.active,
      businesses: subCategory._count.businesses,
    })),
  }));

  const tagRows: AdminTagRow[] = tags.map((tag) => ({
    id: tag.id,
    nameFa: tag.nameFa,
    nameEn: tag.nameEn,
    nameDe: tag.nameDe,
    slug: tag.slug,
    businesses: tag._count.businesses,
  }));
  const attributeRows: AdminAttributeDefinitionRow[] = attributes.map((attribute) => ({
    id: attribute.id,
    key: attribute.key,
    labelFa: attribute.labelFa,
    labelEn: attribute.labelEn,
    labelDe: attribute.labelDe,
    dataType: attribute.dataType,
    unit: attribute.unit,
    options: attribute.options,
    sortOrder: attribute.sortOrder,
    active: attribute.active,
    values: attribute._count.values,
  }));
  const tagSectionTitle = locale === "fa"
    ? "\u0645\u062d\u0635\u0648\u0644\u0627\u062a\u060c \u062e\u062f\u0645\u0627\u062a \u0648 \u062d\u0648\u0632\u0647\u200c\u0647\u0627\u06cc \u0641\u0639\u0627\u0644\u06cc\u062a"
    : locale === "de"
      ? "Produkte, Dienstleistungen und Tätigkeitsbereiche"
      : "Products, services and areas of activity";
  const attributeSectionTitle = locale === "fa" ? "\u0627\u0645\u06a9\u0627\u0646\u0627\u062a" : "Amenities and features";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">{t("taxonomy.title")}</h1>
      </div>

      <AdminSection title={t("taxonomy.tree")}>
        <AdminTaxonomyTree categories={treeRows} />
      </AdminSection>

      <AdminSection title={tagSectionTitle}>
        <AdminTagsManager tags={tagRows} />
      </AdminSection>

      <AdminSection title={attributeSectionTitle}>
        <AdminAttributesManager attributes={attributeRows} />
      </AdminSection>
    </div>
  );
}
