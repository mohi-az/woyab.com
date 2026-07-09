import { OwnerBusinessWizard } from "@/components/dashboard/OwnerBusinessWizard";
import { requireUserId } from "@/lib/auth-user";
import { businessAttributeDefinitionSelect } from "@/lib/business-attributes";
import { businessTagOptionSelect } from "@/lib/business-tags";
import { prisma } from "@/lib/prisma";

export default async function NewOwnerBusinessPage() {
  await requireUserId();
  const [categories, subCategories, specialties, cities, attributeDefinitions, tagOptions] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true, nameFa: true } }),
    prisma.subCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true, nameFa: true, categoryId: true } }),
    prisma.specialty.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }], select: { id: true, nameFa: true, nameEn: true, subCategoryId: true } }),
    prisma.city.findMany({ orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true, nameFa: true } }),
    prisma.attributeDefinition.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }], select: businessAttributeDefinitionSelect }),
    prisma.tag.findMany({ orderBy: [{ nameEn: "asc" }, { nameFa: "asc" }], select: businessTagOptionSelect }),
  ]);

  return <OwnerBusinessWizard categories={categories} subCategories={subCategories} specialties={specialties} cities={cities} attributeDefinitions={attributeDefinitions} tagOptions={tagOptions} />;
}
