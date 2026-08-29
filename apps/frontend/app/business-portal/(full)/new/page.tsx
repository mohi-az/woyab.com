import { OwnerBusinessWizard } from "@/components/dashboard/OwnerBusinessWizard";
import { getLocale } from "next-intl/server";
import { requireUserId } from "@/lib/auth-user";
import { businessAttributeDefinitionSelect } from "@/lib/business-attributes";
import { businessTagOptionSelect } from "@/lib/business-tags";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add Business | Business Portal | WoYab" };

type PageProps = { searchParams: Promise<{ businessName?: string | string[] }> };

export default async function BusinessPortalNewPage({ searchParams }: PageProps) {
  await requireUserId();
  const [categories, subCategories, cities, attributeDefinitions, tagOptions, locale, params] =
    await Promise.all([
      prisma.category.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
        select: { id: true, nameEn: true, nameFa: true },
      }),
      prisma.subCategory.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
        select: { id: true, nameEn: true, nameFa: true, categoryId: true },
      }),
      prisma.city.findMany({
        orderBy: { nameEn: "asc" },
        select: { id: true, nameEn: true, nameFa: true },
      }),
      prisma.attributeDefinition.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
        select: businessAttributeDefinitionSelect,
      }),
      prisma.tag.findMany({
        orderBy: [{ nameEn: "asc" }, { nameFa: "asc" }],
        select: businessTagOptionSelect,
      }),
      getLocale(),
      searchParams,
    ]);

  const requestedName = Array.isArray(params.businessName) ? params.businessName[0] : params.businessName;
  const initialBusinessName = requestedName?.trim().slice(0, 200) ?? "";
  const initialSourceLocale = locale === "fa" ? "FA" : locale === "en" ? "EN" : "DE";

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <OwnerBusinessWizard
        categories={categories}
        subCategories={subCategories}
        cities={cities}
        attributeDefinitions={attributeDefinitions}
        tagOptions={tagOptions}
        initialBusinessName={initialBusinessName}
        initialSourceLocale={initialSourceLocale}
      />
    </div>
  );
}
