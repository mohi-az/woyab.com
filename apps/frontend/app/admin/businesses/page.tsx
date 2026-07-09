import { getTranslations } from "next-intl/server";
import { AdminBusinessFilters } from "@/components/admin/AdminBusinessFilters";
import { AdminBusinessGrid, type AdminBusinessRow } from "@/components/admin/AdminBusinessGrid";
import { AdminSection } from "@/components/admin/AdminPrimitives";
import { requireAdmin } from "@/lib/admin-auth";
import { businessAttributeDefinitionSelect, businessAttributeValueSelect } from "@/lib/business-attributes";
import { businessTagOptionSelect, businessTagValueSelect } from "@/lib/business-tags";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 15;
const statuses = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED", "REJECTED"] as const;

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

function optionalPositiveInt(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function nullableOption<T extends { id: number; nameEn?: string | null; nameFa?: string | null }>(item: T | null) {
  return item ? { id: item.id, nameEn: item.nameEn ?? null, nameFa: item.nameFa ?? null } : null;
}

export default async function AdminBusinessesPage({ searchParams }: PageProps) {
  const [params, t, admin] = await Promise.all([searchParams, getTranslations("Admin"), requireAdmin()]);
  const page = positiveInt(first(params.page));
  const status = first(params.status);
  const categoryId = optionalPositiveInt(first(params.categoryId));
  const cityId = optionalPositiveInt(first(params.cityId));
  const q = first(params.q)?.trim();
  const validStatus = statuses.includes(status as (typeof statuses)[number]) ? status as (typeof statuses)[number] : null;
  const where = {
    ...(validStatus && { status: validStatus }),
    ...(categoryId && { categoryId }),
    ...(cityId && { cityId }),
    ...(q && {
      OR: [
        { businessName: { contains: q, mode: "insensitive" as const } },
        { slug: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
      ],
    }),
  };

  const [businessesRaw, total, categories, subCategories, specialties, cities, ownerOptions, attributeDefinitions, tagOptions] = await Promise.all([
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
        businessHours: {
          orderBy: { dayOfWeek: "asc" },
          select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true, note: true },
        },
        translations: { select: { locale: true, businessName: true, shortDescription: true, description: true } },
        attributes: {
          select: businessAttributeValueSelect,
        },
        tags: {
          select: businessTagValueSelect,
        },
      },
    }),
    prisma.business.count({ where }),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true, nameFa: true } }),
    prisma.subCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true, nameFa: true, categoryId: true } }),
    prisma.specialty.findMany({ orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }], select: { id: true, nameFa: true, nameEn: true, subCategoryId: true } }),
    prisma.city.findMany({ orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true, nameFa: true } }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: [{ role: "asc" }, { name: "asc" }, { email: "asc" }],
      take: 300,
      select: { id: true, name: true, email: true, role: true },
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
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageQuery = new URLSearchParams();
  if (validStatus) pageQuery.set("status", validStatus);
  if (q) pageQuery.set("q", q);
  if (categoryId) pageQuery.set("categoryId", String(categoryId));
  if (cityId) pageQuery.set("cityId", String(cityId));
  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams(pageQuery);
    query.set("page", String(nextPage));
    return `/admin/businesses?${query.toString()}`;
  };
  const businesses: AdminBusinessRow[] = businessesRaw.map((business) => ({
    id: business.id,
    slug: business.slug,
    sourceLocale: business.sourceLocale,
    businessName: business.businessName,
    ownerId: business.ownerId,
    legalName: business.legalName,
    shortDescription: business.shortDescription,
    description: business.description,
    categoryId: business.categoryId,
    subCategoryId: business.subCategoryId,
    specialtyId: business.specialtyId,
    cityId: business.cityId,
    districtId: business.districtId,
    latitude: business.latitude,
    longitude: business.longitude,
    address: business.address,
    postalCode: business.postalCode,
    email: business.email,
    phone: business.phone,
    mobile: business.mobile,
    website: business.website,
    status: business.status,
    verified: business.verified,
    featured: business.featured,
    businessHours: business.businessHours,
    category: business.category,
    subCategory: nullableOption(business.subCategory),
    city: business.city,
    owner: business.owner,
    translations: business.translations,
    attributes: business.attributes,
    tags: business.tags,
  }));

  return (
    <div className="space-y-6">
      <AdminSection title={t("filters.title")}>
        <AdminBusinessFilters
          q={q}
          categoryId={categoryId}
          cityId={cityId}
          status={validStatus}
          categories={categories}
          cities={cities}
          statuses={statuses}
        />
      </AdminSection>

      <AdminBusinessGrid
        businesses={businesses}
        total={total}
        page={page}
        totalPages={totalPages}
        categories={categories}
        subCategories={subCategories}
        specialties={specialties}
        cities={cities}
        ownerOptions={ownerOptions.map((owner) => ({
          value: owner.id,
          label: [owner.name, owner.email, owner.role].filter(Boolean).join(" / "),
        }))}
        attributeDefinitions={attributeDefinitions}
        tagOptions={tagOptions}
        canCreate={admin.role === "SUPER_ADMIN"}
        previousHref={pageHref(Math.max(1, page - 1))}
        nextHref={pageHref(Math.min(totalPages, page + 1))}
      />
    </div>
  );
}
