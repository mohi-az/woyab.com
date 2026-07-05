import { getTranslations } from "next-intl/server";
import { AdminTaxonomyTree, type CategoryTreeRow } from "@/components/admin/AdminTaxonomyTree";
import { AdminSection } from "@/components/admin/AdminPrimitives";
import { prisma } from "@/lib/prisma";

export default async function AdminTaxonomyPage() {
  const [t, categories] = await Promise.all([
    getTranslations("Admin"),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      include: {
        _count: { select: { businesses: true } },
        subCategories: {
          orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
          include: {
            _count: { select: { businesses: true } },
            specialties: {
              orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
              include: { _count: { select: { businesses: true } } },
            },
          },
        },
      },
    }),
  ]);

  const treeRows: CategoryTreeRow[] = categories.map((category) => ({
    id: category.id,
    nameFa: category.nameFa,
    nameEn: category.nameEn,
    slug: category.slug,
    icon: category.icon,
    sortOrder: category.sortOrder,
    active: category.active,
    businesses: category._count.businesses,
    subCategories: category.subCategories.map((subCategory) => ({
      id: subCategory.id,
      nameFa: subCategory.nameFa,
      nameEn: subCategory.nameEn,
      slug: subCategory.slug,
      icon: subCategory.icon,
      categoryId: subCategory.categoryId,
      sortOrder: subCategory.sortOrder,
      active: subCategory.active,
      businesses: subCategory._count.businesses,
      specialties: subCategory.specialties.map((specialty) => ({
        id: specialty.id,
        nameFa: specialty.nameFa,
        nameEn: specialty.nameEn,
        sortOrder: specialty.sortOrder,
        active: specialty.active,
        businesses: specialty._count.businesses,
      })),
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">{t("taxonomy.title")}</h1>
      </div>

      <AdminSection title={t("taxonomy.tree")}>
        <AdminTaxonomyTree categories={treeRows} />
      </AdminSection>
    </div>
  );
}
