import { OwnerBusinessWizard } from "@/components/dashboard/OwnerBusinessWizard";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export default async function NewOwnerBusinessPage() {
  await requireUserId();
  const [categories, subCategories, specialties, cities] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true, nameFa: true } }),
    prisma.subCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true, nameFa: true, categoryId: true } }),
    prisma.specialty.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }], select: { id: true, nameFa: true, nameEn: true, subCategoryId: true } }),
    prisma.city.findMany({ orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true, nameFa: true } }),
  ]);

  return <OwnerBusinessWizard categories={categories} subCategories={subCategories} specialties={specialties} cities={cities} />;
}
