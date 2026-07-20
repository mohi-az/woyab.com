import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { businessAttributeDefinitionSelect, businessAttributeValueSelect } from "@/lib/business-attributes";
import { businessTagOptionSelect, businessTagValueSelect } from "@/lib/business-tags";
import {
  removeOwnerBusiness,
  restoreOwnerBusiness,
  updateOwnerBusinessAttributes,
  updateOwnerBusinessDetails,
  updateOwnerBusinessHours,
  updateOwnerBusinessTags,
  createOwnerServiceChange,
  deactivateOwnerServiceChange,
  updateOwnerServiceChange,
} from "@/lib/owner-actions";
import { BusinessAttributeFields } from "@/components/business/BusinessAttributeFields";
import { BusinessTagFields } from "@/components/business/BusinessTagFields";
import { BusinessHoursEditor } from "@/components/dashboard/BusinessHoursEditor";
import { BusinessEditForm } from "@/components/dashboard/BusinessEditForm";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ businessId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { businessId } = await params;
  const business = await prisma.business.findFirst({
    where: { id: businessId },
    select: { businessName: true },
  });
  return { title: `Edit ${business?.businessName ?? "Business"} | Business Portal | Fargo` };
}

export default async function BusinessEditPage({ params }: PageProps) {
  const [{ businessId }, userId, locale] = await Promise.all([params, requireUserId(), getLocale()]);

  const [business, attributeDefinitions, tagOptions, categoryOptions, subCategoryOptions, specialtyOptions, cityOptions, districtOptions] =
    await Promise.all([
      prisma.business.findFirst({
        where: { id: businessId, ownerId: userId },
        select: {
          id: true,
          slug: true,
          businessName: true,
          legalName: true,
          shortDescription: true,
          description: true,
          email: true,
          phone: true,
          mobile: true,
          whatsapp: true,
          website: true,
          instagram: true,
          telegram: true,
          facebook: true,
          youtube: true,
          linkedin: true,
          address: true,
          postalCode: true,
          categoryId: true,
          subCategoryId: true,
          specialtyId: true,
          cityId: true,
          districtId: true,
          latitude: true,
          longitude: true,
          establishedYear: true,
          priceRange: true,
          logoUrl: true,
          coverImageUrl: true,
          status: true,
          sourceLocale: true,
          removedAt: true,
          reviewCount: true,
          averageRating: true,
          translations: {
            orderBy: { locale: "asc" },
            select: { locale: true, businessName: true, shortDescription: true, description: true },
          },
          businessHours: {
            orderBy: { dayOfWeek: "asc" },
            select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true, note: true },
          },
          attributes: { select: businessAttributeValueSelect },
          tags: { select: businessTagValueSelect },
          services: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, description: true, price: true, currency: true, duration: true, unit: true, active: true, sortOrder: true },
          },
          changeRequests: { where: { status: "PENDING" }, select: { id: true, kind: true } },
        },
      }),
      prisma.attributeDefinition.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
        select: businessAttributeDefinitionSelect,
      }),
      prisma.tag.findMany({ orderBy: [{ nameEn: "asc" }, { nameFa: "asc" }], select: businessTagOptionSelect }),
      prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true, nameFa: true } }),
      prisma.subCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, categoryId: true, nameEn: true, nameFa: true } }),
      prisma.specialty.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, subCategoryId: true, nameEn: true, nameFa: true } }),
      prisma.city.findMany({ orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true, nameFa: true } }),
      prisma.district.findMany({ orderBy: { nameEn: "asc" }, select: { id: true, cityId: true, nameEn: true, nameFa: true } }),
    ]);

  if (!business) notFound();

  const categoryName = categoryOptions.find((c) => c.id === business.categoryId);
  const cityName = cityOptions.find((c) => c.id === business.cityId);

  const initialDraft = {
    businessName: business.businessName,
    shortDescription: business.shortDescription ?? "",
    description: business.description ?? "",
    logoUrl: business.logoUrl ?? undefined,
    coverImageUrl: business.coverImageUrl ?? undefined,
    categoryName: locale === "fa" ? (categoryName?.nameFa ?? categoryName?.nameEn ?? "") : (categoryName?.nameEn ?? ""),
    cityName: locale === "fa" ? (cityName?.nameFa ?? cityName?.nameEn ?? "") : (cityName?.nameEn ?? ""),
    address: business.address ?? "",
    phone: business.phone ?? "",
    mobile: business.mobile ?? "",
    website: business.website ?? "",
    email: business.email ?? "",
    priceRange: business.priceRange ?? undefined,
    averageRating: business.averageRating,
    reviewCount: business.reviewCount,
    services: business.services.map((s) => ({ title: s.title, price: s.price?.toString(), currency: s.currency })),
  };

  const locLabel = (item: { nameEn: string | null; nameFa: string | null }) =>
    locale === "fa" ? (item.nameFa ?? item.nameEn ?? "") : (item.nameEn ?? "");

  const ownerInputClass = "min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary";
  const ownerButtonClass = "min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-black text-white";

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
    <BusinessEditForm
      business={{
        ...business,
        services: business.services.map((s) => ({
          ...s,
          price: s.price !== null ? Number(s.price) : null,
        })),
      }}
      initialDraft={initialDraft}
      attributeDefinitions={attributeDefinitions}
      tagOptions={tagOptions}
      categoryOptions={categoryOptions}
      subCategoryOptions={subCategoryOptions}
      specialtyOptions={specialtyOptions}
      cityOptions={cityOptions}
      districtOptions={districtOptions}
      locale={locale}
      actions={{
        updateDetails: updateOwnerBusinessDetails,
        updateAttributes: updateOwnerBusinessAttributes,
        updateTags: updateOwnerBusinessTags,
        updateHours: updateOwnerBusinessHours,
        createService: createOwnerServiceChange,
        updateService: updateOwnerServiceChange,
        deactivateService: deactivateOwnerServiceChange,
        removeBusiness: removeOwnerBusiness,
        restoreBusiness: restoreOwnerBusiness,
      }}
    />
    </div>
  );
}
