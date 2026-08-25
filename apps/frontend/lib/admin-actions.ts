"use server";

import type { AttributeDataType, BusinessStatus, DayOfWeek, Prisma, ReviewStatus, UserRole } from "@woyab/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appLocales } from "@/i18n/config";
import { requireAdmin, requireSuperAdmin } from "@/lib/admin-auth";
import { applyBusinessChangeRequest } from "@/lib/business-change-requests";
import { ownershipRetentionDate } from "@/lib/business-claims";
import { buildReviewModerationEmail, renderEmailCard } from "@/lib/email-templates";
import { sendMail } from "@/lib/mail";
import { businessAttributeDefinitionSelect, syncBusinessAttributes } from "@/lib/business-attributes";
import { resolvePermanentBusinessCover } from "@/lib/business-image-storage";
import { syncBusinessTags } from "@/lib/business-tags";
import { prisma } from "@/lib/prisma";

const businessStatuses: BusinessStatus[] = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED", "REJECTED"];
const reviewStatuses: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED"];
const userRoles: UserRole[] = ["USER", "OWNER", "ADMIN", "SUPER_ADMIN"];
const claimStatuses = ["UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"] as const;
const daysOfWeek: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const attributeDataTypes: AttributeDataType[] = ["TEXT", "NUMBER", "BOOLEAN"];
const phonePattern = /^\+?[0-9\s().-]{6,24}$/;
const postalCodePattern = /^[A-Za-z0-9][A-Za-z0-9\s-]{2,12}$/;
const websitePattern = /^https?:\/\/[^\s]+\.[^\s]+$/i;

const businessContactSchema = z.object({
  email: z.string().trim().max(254).refine((input) => !input || z.email().safeParse(input).success, "Enter a valid email address.").transform((input) => input || null),
  phone: z.string().trim().max(24).refine((input) => !input || phonePattern.test(input), "Enter a valid phone number.").transform((input) => input || null),
  mobile: z.string().trim().max(24).refine((input) => !input || phonePattern.test(input), "Enter a valid mobile number.").transform((input) => input || null),
  website: z.string().trim().max(2048).refine((input) => !input || websitePattern.test(input), "Enter a valid website URL starting with http:// or https://.").transform((input) => input || null),
  postalCode: z.string().trim().max(16).refine((input) => !input || postalCodePattern.test(input), "Enter a valid postal code.").transform((input) => input || null),
});

type TaxonomyEntity = "category" | "subcategory" | "specialty" | "tag" | "feature";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function nullableValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  return raw || null;
}

function booleanValue(formData: FormData, key: string) {
  return value(formData, key) === "true" || formData.get(key) === "on";
}

function intValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

function intValues(formData: FormData, key: string) {
  return [...new Set(formData.getAll(key)
    .map((item) => Number(typeof item === "string" ? item.trim() : item))
    .filter((item) => Number.isInteger(item) && item > 0))];
}

function numberValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function businessContactData(formData: FormData) {
  const parsed = businessContactSchema.safeParse({
    email: value(formData, "email"),
    phone: value(formData, "phone"),
    mobile: value(formData, "mobile"),
    website: value(formData, "website"),
    postalCode: value(formData, "postalCode"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Please check contact fields.");
  }

  return parsed.data;
}

function googleRatingData(formData: FormData) {
  const googleRating = numberValue(formData, "googleRating");
  const googleUserRatingCount = intValue(formData, "googleUserRatingCount");

  if (googleRating !== null && (googleRating < 0 || googleRating > 5)) {
    throw new Error("Google rating must be between 0 and 5.");
  }
  if (googleUserRatingCount !== null && googleUserRatingCount < 0) {
    throw new Error("Google review count cannot be negative.");
  }

  return { googleRating, googleUserRatingCount };
}

async function validateBusinessTaxonomy(categoryId: number, subCategoryId: number | null, specialtyIds: number[]) {
  if (!subCategoryId) {
    if (specialtyIds.length) throw new Error("لطفاً قبل از انتخاب تخصص، زیردسته‌بندی را انتخاب کنید.");
    return { subCategoryId: null, specialtyIds: [], specialtyId: null };
  }

  const [subCategory, matchingSpecialties] = await Promise.all([
    prisma.subCategory.findFirst({ where: { id: subCategoryId, categoryId }, select: { id: true } }),
    specialtyIds.length
      ? prisma.specialty.count({ where: { id: { in: specialtyIds }, subCategoryId } })
      : Promise.resolve(0),
  ]);

  if (!subCategory) {
    if (!specialtyIds.length) return { subCategoryId: null, specialtyIds: [], specialtyId: null };
    throw new Error("زیردسته‌بندی انتخاب‌شده با دسته‌بندی اصلی مطابقت ندارد.");
  }

  if (matchingSpecialties !== specialtyIds.length) {
    throw new Error("یک یا چند تخصص انتخاب‌شده با این زیردسته‌بندی مطابقت ندارند.");
  }

  return { subCategoryId, specialtyIds, specialtyId: specialtyIds[0] ?? null };
}

function slugValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw || !/^[a-z0-9-]+$/.test(raw)) return "";
  return raw;
}

function keyValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw || !/^[a-z0-9_]+$/.test(raw)) return "";
  return raw;
}

function prismaErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") return error.code;
  return "";
}

function prismaErrorTarget(error: unknown) {
  if (error && typeof error === "object" && "meta" in error && error.meta && typeof error.meta === "object" && "target" in error.meta) {
    return error.meta.target;
  }
  return undefined;
}

function targetIncludes(error: unknown, field: string) {
  const target = prismaErrorTarget(error);
  if (Array.isArray(target)) return target.includes(field);
  return String(target ?? "").includes(field);
}

function taxonomyActionError(error: unknown, entity: TaxonomyEntity) {
  if (error instanceof Error && !prismaErrorCode(error)) return error;

  const labels: Record<TaxonomyEntity, string> = {
    category: "دسته",
    subcategory: "زیر‌دسته",
    specialty: "تخصص",
    tag: "برچسب",
    feature: "امکان",
  };
  const label = labels[entity];
  const code = prismaErrorCode(error);

  if (code === "P2002") {
    if (targetIncludes(error, "key")) return new Error("این کلید قبلا ثبت شده است. یک کلید یکتا وارد کنید.");
    if (targetIncludes(error, "slug")) return new Error("این اسلاگ قبلا ثبت شده است. یک اسلاگ یکتا وارد کنید.");
    return new Error(`این ${label} قبلا با مقدار مشابه ثبت شده است.`);
  }

  if (code === "P2025") return new Error(`${label} پیدا نشد یا قبلا حذف شده است.`);
  if (code === "P2003") return new Error(`این ${label} در بخش‌های دیگر استفاده شده و فعلا قابل حذف نیست.`);

  return new Error(`عملیات ${label} انجام نشد. لطفا دوباره تلاش کنید.`);
}

function attributeDefinitionData(formData: FormData) {
  const key = keyValue(formData, "key");
  const labelFa = value(formData, "labelFa");
  const dataType = value(formData, "dataType") as AttributeDataType;
  if (!key || !labelFa || !attributeDataTypes.includes(dataType)) {
    throw new Error("کلید، عنوان فارسی و نوع امکان را درست وارد کنید.");
  }

  return {
    key,
    labelFa,
    labelEn: nullableValue(formData, "labelEn"),
    labelDe: nullableValue(formData, "labelDe"),
    dataType,
    unit: null,
    options: null,
    sortOrder: intValue(formData, "sortOrder") ?? 0,
    active: booleanValue(formData, "active"),
  };
}

function businessHoursCreateData(formData: FormData) {
  return daysOfWeek.flatMap((dayOfWeek) => {
    const enabled = value(formData, `hours_${dayOfWeek}_enabled`) === "true";
    if (!enabled) return [];

    const isClosed = value(formData, `hours_${dayOfWeek}_isClosed`) === "true";
    const openTime = nullableValue(formData, `hours_${dayOfWeek}_openTime`);
    const closeTime = nullableValue(formData, `hours_${dayOfWeek}_closeTime`);

    return [{
      dayOfWeek,
      isClosed,
      openTime: isClosed ? null : openTime,
      closeTime: isClosed ? null : closeTime,
      note: nullableValue(formData, `hours_${dayOfWeek}_note`),
    }];
  });
}

async function syncBusinessHours(tx: Prisma.TransactionClient, businessId: string, formData: FormData) {
  const configuredDays = new Set<DayOfWeek>();

  for (const hour of businessHoursCreateData(formData)) {
    configuredDays.add(hour.dayOfWeek);
    await tx.businessHours.upsert({
      where: { businessId_dayOfWeek: { businessId, dayOfWeek: hour.dayOfWeek } },
      update: {
        isClosed: hour.isClosed,
        openTime: hour.openTime,
        closeTime: hour.closeTime,
        note: hour.note,
      },
      create: {
        businessId,
        ...hour,
      },
    });
  }

  const disabledDays = daysOfWeek.filter((dayOfWeek) => !configuredDays.has(dayOfWeek));
  if (disabledDays.length) {
    await tx.businessHours.deleteMany({
      where: {
        businessId,
        dayOfWeek: { in: disabledDays },
      },
    });
  }
}

async function syncBusinessSpecialties(tx: Prisma.TransactionClient, businessId: string, specialtyIds: number[]) {
  await tx.$executeRaw`DELETE FROM "business_specialties" WHERE "businessId" = ${businessId}`;

  for (const specialtyId of specialtyIds) {
    await tx.$executeRaw`
      INSERT INTO "business_specialties" ("businessId", "specialtyId")
      VALUES (${businessId}, ${specialtyId})
      ON CONFLICT DO NOTHING
    `;
  }
}

async function audit(actorId: string, action: string, entityType: string, entityId?: string | null, metadata?: Prisma.InputJsonValue) {
  await prisma.adminAuditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      metadata,
    },
  });
}

async function recalculateBusinessRating(tx: Prisma.TransactionClient, businessId: string) {
  const [aggregate, count] = await Promise.all([
    tx.review.aggregate({
      where: { businessId, status: "APPROVED" },
      _avg: { rating: true },
    }),
    tx.review.count({ where: { businessId, status: "APPROVED" } }),
  ]);

  await tx.business.update({
    where: { id: businessId },
    data: {
      averageRating: aggregate._avg.rating ?? 0,
      reviewCount: count,
    },
  });
}

async function promoteUserToOwner(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "USER") {
    await tx.user.update({ where: { id: userId }, data: { role: "OWNER", authVersion: { increment: 1 } } });
  }
}

function refreshAdmin() {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/businesses");
  revalidatePath("/admin/taxonomy");
  revalidatePath("/businesses", "layout");
  revalidatePath("/dashboard", "layout");
  for (const locale of appLocales) {
    revalidatePath(`/${locale}/admin`, "layout");
    revalidatePath(`/${locale}/admin/businesses`);
    revalidatePath(`/${locale}/admin/taxonomy`);
    revalidatePath(`/${locale}/businesses`, "layout");
  }
}

export async function setBusinessStatus(formData: FormData) {
  const actor = await requireAdmin();
  const businessId = value(formData, "businessId");
  const status = value(formData, "status") as BusinessStatus;
  if (!businessId || !businessStatuses.includes(status)) throw new Error("Invalid business status.");

  await prisma.business.update({ where: { id: businessId }, data: { status } });
  await audit(actor.id, "business.status", "Business", businessId, { status });
  refreshAdmin();
}

export async function setBusinessFlag(formData: FormData) {
  const actor = await requireAdmin();
  const businessId = value(formData, "businessId");
  const field = value(formData, "field");
  const enabled = booleanValue(formData, "enabled");
  if (!businessId || !["verified", "featured"].includes(field)) throw new Error("Invalid business flag.");

  await prisma.business.update({ where: { id: businessId }, data: { [field]: enabled } });
  await audit(actor.id, `business.${field}`, "Business", businessId, { enabled });
  refreshAdmin();
}

export async function updateBusinessDetails(formData: FormData) {
  const actor = await requireAdmin();
  const businessId = value(formData, "businessId");
  if (!businessId) throw new Error("Business is required.");

  const sourceLocale = value(formData, "sourceLocale") as "DE" | "EN" | "FA";
  const categoryId = intValue(formData, "categoryId");
  const cityId = intValue(formData, "cityId");
  const subCategoryId = intValue(formData, "subCategoryId");
  const specialtyIds = intValues(formData, "specialtyIds");
  const specialtyId = specialtyIds[0] ?? null;
  const ownerId = nullableValue(formData, "ownerId");
  const googlePlaceId = nullableValue(formData, "googlePlaceId");
  const contact = businessContactData(formData);
  const googleRatings = googleRatingData(formData);

  if (!["DE", "EN", "FA"].includes(sourceLocale) || !categoryId || !cityId) {
    throw new Error("Please check the required business fields.");
  }
  const taxonomy = await validateBusinessTaxonomy(categoryId, subCategoryId, specialtyIds);

  if (ownerId) {
    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, active: true } });
    if (!owner?.active) throw new Error("Selected owner is not an active user.");
  }

  if (googlePlaceId) {
    const duplicatePlace = await prisma.business.findFirst({
      where: { googlePlaceId, id: { not: businessId }, removedAt: null },
      select: { businessName: true },
    });
    if (duplicatePlace) throw new Error(`This Google Place ID already belongs to ${duplicatePlace.businessName}.`);
  }

  const currentBusiness = await prisma.business.findUnique({
    where: { id: businessId },
    select: { coverImageUrl: true, googlePlaceId: true },
  });
  if (!currentBusiness) throw new Error("Business not found.");
  const coverImageUrl = await resolvePermanentBusinessCover({
    googlePlaceId,
    requestedCoverImageUrl: nullableValue(formData, "coverImageUrl"),
    existingCoverImageUrl: currentBusiness.coverImageUrl,
    refreshGoogleCover: currentBusiness.googlePlaceId !== googlePlaceId,
  });

  const translations = (["DE", "EN", "FA"] as const).map((locale) => ({
    locale,
    businessName: value(formData, `businessName_${locale}`),
    shortDescription: nullableValue(formData, `shortDescription_${locale}`),
    description: nullableValue(formData, `description_${locale}`),
  })).filter((translation) => translation.businessName);

  const source = translations.find((translation) => translation.locale === sourceLocale) ?? translations[0];
  if (!source) throw new Error("At least one translated business name is required.");

  await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: businessId },
      data: {
        slug: value(formData, "slug"),
        sourceLocale,
        businessName: source.businessName,
        shortDescription: source.shortDescription,
        description: source.description,
        legalName: nullableValue(formData, "legalName"),
        categoryId,
        subCategoryId: taxonomy.subCategoryId,
        specialtyId: taxonomy.specialtyId,
        ownerId,
        cityId,
        districtId: intValue(formData, "districtId"),
        latitude: numberValue(formData, "latitude"),
        longitude: numberValue(formData, "longitude"),
        address: nullableValue(formData, "address"),
        postalCode: contact.postalCode,
        googlePlaceId,
        googleRating: googlePlaceId ? googleRatings.googleRating : null,
        googleUserRatingCount: googlePlaceId ? googleRatings.googleUserRatingCount : null,
        googleRatingUpdatedAt: googlePlaceId && (googleRatings.googleRating !== null || googleRatings.googleUserRatingCount !== null)
          ? new Date()
          : null,
        coverImageUrl,
        email: contact.email,
        phone: contact.phone,
        mobile: contact.mobile,
        website: contact.website,
        translations: {
          upsert: translations.map((translation) => ({
            where: { businessId_locale: { businessId, locale: translation.locale } },
            update: {
              businessName: translation.businessName,
              shortDescription: translation.shortDescription,
              description: translation.description,
            },
            create: {
              locale: translation.locale,
              businessName: translation.businessName,
              shortDescription: translation.shortDescription,
              description: translation.description,
            },
          })),
        },
      },
    });
    const attributeDefinitions = await tx.attributeDefinition.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
      select: businessAttributeDefinitionSelect,
    });
    await syncBusinessAttributes(tx, businessId, attributeDefinitions, formData);
    await syncBusinessTags(tx, businessId, formData);
    await syncBusinessSpecialties(tx, businessId, specialtyIds);
    await syncBusinessHours(tx, businessId, formData);
    if (ownerId) await promoteUserToOwner(tx, ownerId);
  });

  await audit(actor.id, "business.update", "Business", businessId, { sourceLocale, ownerId });
  refreshAdmin();
}

export async function createBusinessDetails(formData: FormData) {
  const actor = await requireAdmin();
  if (actor.role !== "SUPER_ADMIN") throw new Error("Only super admins can create businesses.");

  const slug = value(formData, "slug");
  const sourceLocale = value(formData, "sourceLocale") as "DE" | "EN" | "FA";
  const categoryId = intValue(formData, "categoryId");
  const cityId = intValue(formData, "cityId");
  const subCategoryId = intValue(formData, "subCategoryId");
  const specialtyIds = intValues(formData, "specialtyIds");
  const specialtyId = specialtyIds[0] ?? null;
  const ownerId = nullableValue(formData, "ownerId");
  const googlePlaceId = nullableValue(formData, "googlePlaceId");
  const contact = businessContactData(formData);
  const googleRatings = googleRatingData(formData);

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error("A valid slug is required.");
  if (!["DE", "EN", "FA"].includes(sourceLocale) || !categoryId || !cityId) {
    throw new Error("Please check the required business fields.");
  }
  const taxonomy = await validateBusinessTaxonomy(categoryId, subCategoryId, specialtyIds);

  if (ownerId) {
    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, active: true } });
    if (!owner?.active) throw new Error("Selected owner is not an active user.");
  }

  const duplicate = await prisma.business.findUnique({ where: { slug }, select: { id: true } });
  if (duplicate) throw new Error("This business slug already exists.");
  if (googlePlaceId) {
    const duplicatePlace = await prisma.business.findFirst({
      where: { googlePlaceId, removedAt: null },
      select: { businessName: true },
    });
    if (duplicatePlace) throw new Error(`This Google Place ID already belongs to ${duplicatePlace.businessName}.`);
  }

  const coverImageUrl = await resolvePermanentBusinessCover({
    googlePlaceId,
    requestedCoverImageUrl: nullableValue(formData, "coverImageUrl"),
  });

  const translations = (["DE", "EN", "FA"] as const).map((locale) => ({
    locale,
    businessName: value(formData, `businessName_${locale}`),
    shortDescription: nullableValue(formData, `shortDescription_${locale}`),
    description: nullableValue(formData, `description_${locale}`),
  })).filter((translation) => translation.businessName);

  const source = translations.find((translation) => translation.locale === sourceLocale) ?? translations[0];
  if (!source) throw new Error("At least one translated business name is required.");

  const business = await prisma.$transaction(async (tx) => {
    const created = await tx.business.create({
      data: {
        slug,
        sourceLocale,
        businessName: source.businessName,
        shortDescription: source.shortDescription,
        description: source.description,
        legalName: nullableValue(formData, "legalName"),
        categoryId,
        subCategoryId: taxonomy.subCategoryId,
        specialtyId: taxonomy.specialtyId,
        ownerId,
        cityId,
        districtId: intValue(formData, "districtId"),
        latitude: numberValue(formData, "latitude"),
        longitude: numberValue(formData, "longitude"),
        address: nullableValue(formData, "address"),
        postalCode: contact.postalCode,
        googlePlaceId,
        googleRating: googlePlaceId ? googleRatings.googleRating : null,
        googleUserRatingCount: googlePlaceId ? googleRatings.googleUserRatingCount : null,
        googleRatingUpdatedAt: googlePlaceId && (googleRatings.googleRating !== null || googleRatings.googleUserRatingCount !== null)
          ? new Date()
          : null,
        coverImageUrl,
        email: contact.email,
        phone: contact.phone,
        mobile: contact.mobile,
        website: contact.website,
        businessHours: {
          create: businessHoursCreateData(formData),
        },
        translations: {
          create: translations.map((translation) => ({
            locale: translation.locale,
            businessName: translation.businessName,
            shortDescription: translation.shortDescription,
            description: translation.description,
          })),
        },
      },
      select: { id: true },
    });
    const attributeDefinitions = await tx.attributeDefinition.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
      select: businessAttributeDefinitionSelect,
    });
    await syncBusinessAttributes(tx, created.id, attributeDefinitions, formData);
    await syncBusinessTags(tx, created.id, formData);
    await syncBusinessSpecialties(tx, created.id, specialtyIds);
    if (ownerId) await promoteUserToOwner(tx, ownerId);
    return created;
  });

  await audit(actor.id, "business.create", "Business", business.id, { status: "PENDING", sourceLocale, ownerId });
  refreshAdmin();
}

export async function setReviewStatus(formData: FormData) {
  const actor = await requireAdmin();
  const reviewId = value(formData, "reviewId");
  const status = value(formData, "status") as ReviewStatus;
  if (!reviewId || !reviewStatuses.includes(status)) throw new Error("Invalid review status.");

  const review = await prisma.$transaction(async (tx) => {
    const existing = await tx.review.findUniqueOrThrow({
      where: { id: reviewId },
      select: {
        status: true,
        rating: true,
        title: true,
        user: { select: { email: true, name: true } },
        business: { select: { businessName: true, sourceLocale: true } },
      },
    });
    const updated = await tx.review.update({ where: { id: reviewId }, data: { status } });
    await recalculateBusinessRating(tx, updated.businessId);
    return { ...updated, previousStatus: existing.status, user: existing.user, business: existing.business, rating: existing.rating, title: existing.title };
  });

  await audit(actor.id, "review.status", "Review", reviewId, { status, businessId: review.businessId });
  if (review.user?.email && review.previousStatus !== status && ["APPROVED", "REJECTED"].includes(status)) {
    const emailData = buildReviewModerationEmail({
      userName: review.user.name,
      businessName: review.business.businessName,
      rating: review.rating,
      reviewTitle: review.title,
      status: status as "APPROVED" | "REJECTED",
      locale: review.business.sourceLocale?.toLowerCase() || "fa",
    });

    await sendMail({
      to: review.user.email,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    }).catch(() => undefined);
  }
  refreshAdmin();
}

export async function deleteReview(formData: FormData) {
  const actor = await requireAdmin();
  const reviewId = value(formData, "reviewId");
  if (!reviewId) throw new Error("Review is required.");

  const review = await prisma.$transaction(async (tx) => {
    const existing = await tx.review.findUniqueOrThrow({ where: { id: reviewId }, select: { businessId: true } });
    await tx.review.delete({ where: { id: reviewId } });
    await recalculateBusinessRating(tx, existing.businessId);
    return existing;
  });

  await audit(actor.id, "review.delete", "Review", reviewId, { businessId: review.businessId });
  refreshAdmin();
}

export async function updateUserAccess(formData: FormData) {
  const actor = await requireSuperAdmin();
  const userId = value(formData, "userId");
  const role = value(formData, "role") as UserRole;
  const active = booleanValue(formData, "active");
  if (!userId || !userRoles.includes(role)) throw new Error("Invalid user access update.");

  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true, active: true } });
  if (target.role === "SUPER_ADMIN" && (!active || role !== "SUPER_ADMIN")) {
    const superAdmins = await prisma.user.count({ where: { role: "SUPER_ADMIN", active: true } });
    if (superAdmins <= 1) throw new Error("You cannot remove the last active super admin.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role, active, authVersion: { increment: 1 } },
  });
  await audit(actor.id, "user.access", "User", userId, { role, active });
  refreshAdmin();
}

export async function updateCategory(formData: FormData) {
  const actor = await requireAdmin();
  const id = intValue(formData, "id");
  if (!id) throw new Error("Category is required.");

  try {
    await prisma.category.update({
      where: { id },
      data: {
        nameFa: value(formData, "nameFa"),
        nameEn: value(formData, "nameEn"),
        slug: value(formData, "slug"),
        icon: nullableValue(formData, "icon"),
        sortOrder: intValue(formData, "sortOrder") ?? 0,
        active: booleanValue(formData, "active"),
      },
    });
    await audit(actor.id, "taxonomy.category.update", "Category", String(id));
    refreshAdmin();
  } catch (error) {
    throw taxonomyActionError(error, "category");
  }
}

export async function updateSubCategory(formData: FormData) {
  const actor = await requireAdmin();
  const id = intValue(formData, "id");
  if (!id) throw new Error("Subcategory is required.");

  try {
    await prisma.subCategory.update({
      where: { id },
      data: {
        nameFa: value(formData, "nameFa"),
        nameEn: value(formData, "nameEn"),
        slug: value(formData, "slug"),
        icon: nullableValue(formData, "icon"),
        categoryId: intValue(formData, "categoryId") ?? undefined,
        sortOrder: intValue(formData, "sortOrder") ?? 0,
        active: booleanValue(formData, "active"),
      },
    });
    await audit(actor.id, "taxonomy.subcategory.update", "SubCategory", String(id));
    refreshAdmin();
  } catch (error) {
    throw taxonomyActionError(error, "subcategory");
  }
}

export async function updateSpecialty(formData: FormData) {
  const actor = await requireAdmin();
  const id = intValue(formData, "id");
  if (!id) throw new Error("Specialty is required.");

  try {
    await prisma.specialty.update({
      where: { id },
      data: {
        nameFa: value(formData, "nameFa"),
        nameEn: nullableValue(formData, "nameEn"),
        subCategoryId: intValue(formData, "subCategoryId") ?? undefined,
        sortOrder: intValue(formData, "sortOrder") ?? 0,
        active: booleanValue(formData, "active"),
      },
    });
    await audit(actor.id, "taxonomy.specialty.update", "Specialty", String(id));
    refreshAdmin();
  } catch (error) {
    throw taxonomyActionError(error, "specialty");
  }
}

export async function createTag(formData: FormData) {
  const actor = await requireAdmin();
  const nameFa = value(formData, "nameFa");
  const slug = slugValue(formData, "slug");
  if (!nameFa || !slug) throw new Error("عنوان فارسی و اسلاگ برچسب را درست وارد کنید.");

  try {
    const tag = await prisma.tag.create({
      data: {
        nameFa,
        nameEn: nullableValue(formData, "nameEn"),
        slug,
      },
      select: { id: true },
    });
    await audit(actor.id, "taxonomy.tag.create", "Tag", String(tag.id));
    refreshAdmin();
  } catch (error) {
    throw taxonomyActionError(error, "tag");
  }
}

export async function updateTag(formData: FormData) {
  const actor = await requireAdmin();
  const id = intValue(formData, "id");
  const nameFa = value(formData, "nameFa");
  const slug = slugValue(formData, "slug");
  if (!id || !nameFa || !slug) throw new Error("عنوان فارسی و اسلاگ برچسب را درست وارد کنید.");

  try {
    await prisma.tag.update({
      where: { id },
      data: {
        nameFa,
        nameEn: nullableValue(formData, "nameEn"),
        slug,
      },
    });
    await audit(actor.id, "taxonomy.tag.update", "Tag", String(id));
    refreshAdmin();
  } catch (error) {
    throw taxonomyActionError(error, "tag");
  }
}

export async function deleteTag(formData: FormData) {
  const actor = await requireAdmin();
  const id = intValue(formData, "id");
  if (!id) throw new Error("برچسب انتخاب نشده است.");

  try {
    await prisma.tag.delete({ where: { id } });
    await audit(actor.id, "taxonomy.tag.delete", "Tag", String(id));
    refreshAdmin();
  } catch (error) {
    throw taxonomyActionError(error, "tag");
  }
}

export async function createAttributeDefinition(formData: FormData) {
  const actor = await requireAdmin();
  const data = attributeDefinitionData(formData);

  try {
    const attribute = await prisma.attributeDefinition.create({
      data,
      select: { id: true },
    });
    await audit(actor.id, "taxonomy.attribute.create", "AttributeDefinition", String(attribute.id));
    refreshAdmin();
  } catch (error) {
    throw taxonomyActionError(error, "feature");
  }
}

export async function updateAttributeDefinition(formData: FormData) {
  const actor = await requireAdmin();
  const id = intValue(formData, "id");
  if (!id) throw new Error("امکان انتخاب نشده است.");
  const data = attributeDefinitionData(formData);

  try {
    const previous = await prisma.attributeDefinition.findUnique({
      where: { id },
      select: { dataType: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.attributeDefinition.update({
        where: { id },
        data,
      });

      if (previous && previous.dataType !== data.dataType) {
        await tx.businessAttribute.deleteMany({ where: { attributeId: id } });
      }
    });
    await audit(actor.id, "taxonomy.attribute.update", "AttributeDefinition", String(id));
    refreshAdmin();
  } catch (error) {
    throw taxonomyActionError(error, "feature");
  }
}

export async function deleteAttributeDefinition(formData: FormData) {
  const actor = await requireAdmin();
  const id = intValue(formData, "id");
  if (!id) throw new Error("امکان انتخاب نشده است.");

  try {
    await prisma.attributeDefinition.delete({ where: { id } });
    await audit(actor.id, "taxonomy.attribute.delete", "AttributeDefinition", String(id));
    refreshAdmin();
  } catch (error) {
    throw taxonomyActionError(error, "feature");
  }
}

export async function updateReportStatus(formData: FormData) {
  const actor = await requireAdmin();
  const id = value(formData, "id");
  const status = value(formData, "status") as "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";
  if (!id || !["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"].includes(status)) throw new Error("Invalid report status.");
  const moderatorNote = nullableValue(formData, "moderatorNote");
  const decisionReason = nullableValue(formData, "decisionReason");
  const actionTaken = nullableValue(formData, "actionTaken");
  const final = ["RESOLVED", "DISMISSED"].includes(status);
  if (final && !decisionReason) throw new Error("A public decision reason is required before closing a report.");

  const previous = await prisma.directoryReport.findUniqueOrThrow({
    where: { id },
    select: {
      status: true,
      notifiedAt: true,
      reporterEmail: true,
      reporter: { select: { email: true } },
      business: { select: { businessName: true } },
      review: { select: { business: { select: { businessName: true } } } },
    },
  });
  await prisma.directoryReport.update({
    where: { id },
    data: {
      status,
      resolvedById: final ? actor.id : null,
      resolvedAt: final ? new Date() : null,
      notifiedAt: final ? previous.notifiedAt : null,
      moderatorNote,
      decisionReason,
      actionTaken,
    },
  });
  const recipient = previous.reporter?.email || previous.reporterEmail;
  if (final && recipient && (!previous.notifiedAt || previous.status !== status)) {
    const target = previous.business?.businessName || previous.review?.business.businessName || "reported content";
    try {
      await sendMail({
        to: recipient,
        subject: `WoYab report decision: ${status}`,
        text: `Your report about ${target} was ${status.toLowerCase()}.\n\nDecision: ${decisionReason}\n${actionTaken ? `Action taken: ${actionTaken}` : ""}`,
        html: `<p>Your report about <strong>${escapeHtml(target)}</strong> was ${status.toLowerCase()}.</p><p><strong>Decision:</strong> ${escapeHtml(decisionReason || "")}</p>${actionTaken ? `<p><strong>Action taken:</strong> ${escapeHtml(actionTaken)}</p>` : ""}`,
      });
      await prisma.directoryReport.update({ where: { id }, data: { notifiedAt: new Date() } });
    } catch {
      await audit(actor.id, "report.notification_failed", "DirectoryReport", id);
    }
  }
  await audit(actor.id, "report.status", "DirectoryReport", id, { status, decisionReason, actionTaken });
  refreshAdmin();
}

export async function updateClaimStatus(formData: FormData) {
  const actor = await requireAdmin();
  const id = value(formData, "id");
  const status = value(formData, "status") as (typeof claimStatuses)[number];
  if (!id || !claimStatuses.includes(status)) throw new Error("Invalid claim status.");

  const decisionReason = value(formData, "decisionReason");
  if (["APPROVED", "REJECTED"].includes(status) && decisionReason.length < 3) throw new Error("A decision reason is required.");

  const claim = await prisma.$transaction(async (tx) => {
    const existing = await tx.businessClaim.findUniqueOrThrow({
      where: { id },
      include: {
        business: { select: { id: true, businessName: true, ownerId: true, owner: { select: { id: true, email: true, name: true } } } },
        claimant: { select: { id: true, email: true, name: true } },
      },
    });
    if (existing.status !== "UNDER_REVIEW") throw new Error("Only a verified claim under review can be decided.");
    if (status === "APPROVED") {
      if (!existing.claimantUserId) throw new Error("Approved claims must belong to a registered user.");
      if (!existing.verifiedAt || existing.verificationMethod !== "EMAIL_OTP") throw new Error("The business email must be verified before approval.");
      if (
        existing.business.ownerId
        && existing.business.ownerId !== existing.claimantUserId
        && actor.role !== "SUPER_ADMIN"
      ) {
        throw new Error("Only a super admin may transfer an already-owned business.");
      }
      if (existing.business.ownerId && existing.business.ownerId !== existing.claimantUserId) {
        const endedAt = new Date();
        await tx.businessClaim.updateMany({
          where: { businessId: existing.businessId, claimantUserId: existing.business.ownerId, status: "APPROVED" },
          data: { status: "SUPERSEDED", ownershipEndedAt: endedAt, retentionReviewAt: ownershipRetentionDate(endedAt) },
        });
      }
      await tx.business.update({
        where: { id: existing.businessId },
        data: { ownerId: existing.claimantUserId, verified: true },
      });
      await promoteUserToOwner(tx, existing.claimantUserId);
    }
    await tx.businessClaim.update({
      where: { id },
      data: {
        status,
        reviewedById: ["APPROVED", "REJECTED"].includes(status) ? actor.id : null,
        reviewedAt: ["APPROVED", "REJECTED"].includes(status) ? new Date() : null,
        decisionReason: decisionReason || null,
        otpHash: null,
        otpExpiresAt: null,
        retentionReviewAt: status === "REJECTED"
          ? new Date(Date.now() + 180 * 86_400_000)
          : status === "CANCELLED"
            ? new Date(Date.now() + 90 * 86_400_000)
            : undefined,
      },
    });
    return existing;
  }, { isolationLevel: "Serializable" });
  await audit(actor.id, "claim.status", "BusinessClaim", id, {
    status,
    businessId: claim.businessId,
    ownerId: status === "APPROVED" ? claim.claimantUserId : null,
    decisionReason,
  });
  if (["APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
    const recipients = [
      claim.claimant?.email || claim.claimantEmail,
      status === "APPROVED" ? claim.business.owner?.email : null,
    ].filter((email, index, items): email is string => Boolean(email) && items.indexOf(email) === index);
    const isApproved = status === "APPROVED";
    const claimantName = claim.claimant?.name || claim.claimantName || "";
    const html = renderEmailCard({
      badgeText: isApproved ? "تایید شد" : "تایید نشد",
      badgeBg: isApproved ? "#10b981" : "#ef4444",
      title: isApproved ? "تایید درخواست مالکیت کسب‌وکار" : "نتیجه بررسی درخواست مالکیت کسب‌وکار",
      subtitle: isApproved
        ? `سلام ${claimantName ? `${claimantName} عزیز` : "گرامی"}،<br/>با خوشحالی به اطلاع می‌رسانیم که درخواست مالکیت شما برای کسب‌وکار <strong>${claim.business.businessName}</strong> با موفقیت تایید شد.<br/><br/>اکنون دسترسی کامل پنل مدیریت این کسب‌وکار برای حساب شما فعال شده است.`
        : `سلام ${claimantName ? `${claimantName} عزیز` : "گرامی"}،<br/>با تشکر از صبر شما، به اطلاع می‌رسانیم که درخواست مالکیت شما برای کسب‌وکار <strong>${claim.business.businessName}</strong> پس از بررسی مورد تایید قرار نگرفت.`,
      details: [
        { label: "نام کسب‌وکار", value: claim.business.businessName },
        { label: "وضعیت درخواست", value: isApproved ? "تایید شده (Approved)" : "تایید نشد (Rejected)" },
        { label: "توضیح مدیریت", value: decisionReason || (isApproved ? "تایید مدارک و هویت" : "عدم احراز شرایط لازم") },
      ],
      footerNote: "با تشکر از همراهی شما،<br/><strong>تیم WoYab (WoYab Team)</strong>",
    });

    await Promise.allSettled(recipients.map((to) => sendMail({
      to,
      subject: `نتیجه بررسی درخواست مالکیت کسب‌وکار ${claim.business.businessName} | WoYab`,
      text: `The ownership claim for ${claim.business.businessName} is now ${status}. Reason: ${decisionReason || "No additional reason provided."}`,
      html,
    })));
  }
  refreshAdmin();
}

export async function reviewBusinessChangeRequest(formData: FormData) {
  const actor = await requireAdmin();
  const id = value(formData, "id");
  const decision = value(formData, "decision");
  const decisionReason = value(formData, "decisionReason");
  if (!id || !["APPROVE", "REJECT"].includes(decision) || decisionReason.length < 3) throw new Error("A decision and reason are required.");
  const request = await prisma.businessChangeRequest.findUniqueOrThrow({
    where: { id },
    select: {
      submitter: { select: { email: true } },
      business: { select: { businessName: true } },
    },
  });

  if (decision === "APPROVE") {
    await applyBusinessChangeRequest(id, actor.id, decisionReason);
  } else {
    const changed = await prisma.businessChangeRequest.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "REJECTED", reviewedById: actor.id, reviewedAt: new Date(), decisionReason, retentionReviewAt: new Date(Date.now() + 180 * 86_400_000) },
    });
    if (!changed.count) throw new Error("Change request is not pending.");
    await audit(actor.id, "business.change_request.reject", "BusinessChangeRequest", id, { decisionReason });
  }
  if (request.submitter?.email) {
    const isApproved = decision === "APPROVE";
    const html = renderEmailCard({
      badgeText: isApproved ? "تایید و اعمال شد" : "تایید نشد",
      badgeBg: isApproved ? "#10b981" : "#ef4444",
      title: isApproved ? "پیشنهاد تغییرات شما تایید شد" : "نتیجه بررسی پیشنهاد تغییرات کسب‌وکار",
      subtitle: isApproved
        ? `سلام،<br/>با تشکر از مشارکت و همکاری شما در WoYab، پیشنهاد تغییرات ارسالی شما برای کسب‌وکار <strong>${request.business.businessName}</strong> پس از بررسی توسط تیم WoYab تایید و روی صفحه کسب‌وکار اعمال گردید.`
        : `سلام،<br/>با تشکر از مشارکت شما، به اطلاع می‌رسانیم که پیشنهاد تغییرات ارسالی شما برای کسب‌وکار <strong>${request.business.businessName}</strong> پس از بررسی تایید نگردید.`,
      details: [
        { label: "نام کسب‌وکار", value: request.business.businessName },
        { label: "نتیجه بررسی", value: isApproved ? "تایید و اعمال شد" : "تایید نشد" },
        { label: "توضیح مدیریت", value: decisionReason || (isApproved ? "مطابق اطلاعات معتبر" : "اطلاعات پیشنهادی تایید نشد") },
      ],
      footerNote: "با تشکر از همراهی شما در بهبود اطلاعات WoYab،<br/><strong>تیم WoYab (WoYab Team)</strong>",
    });

    await sendMail({
      to: request.submitter.email,
      subject: `نتیجه بررسی پیشنهاد تغییرات کسب‌وکار ${request.business.businessName} | WoYab`,
      text: `Your change request for ${request.business.businessName} was ${isApproved ? "approved" : "rejected"}. Reason: ${decisionReason}`,
      html,
    }).catch(() => undefined);
  }
  refreshAdmin();
  revalidatePath("/admin/change-requests");
}

export async function reviewRetentionItem(formData: FormData) {
  const actor = await requireSuperAdmin();
  const type = value(formData, "type");
  const id = value(formData, "id");
  const action = value(formData, "action");
  if (!id || !["claim", "changeRequest"].includes(type) || !["ANONYMIZE", "LEGAL_HOLD"].includes(action)) throw new Error("Invalid retention action.");

  const retention = type === "claim"
    ? await prisma.businessClaim.findUnique({ where: { id }, select: { retentionReviewAt: true, legalHoldUntil: true } })
    : await prisma.businessChangeRequest.findUnique({ where: { id }, select: { retentionReviewAt: true, legalHoldUntil: true } });
  if (!retention?.retentionReviewAt) throw new Error("This record has no retention-review deadline.");
  if (action === "ANONYMIZE" && retention.retentionReviewAt > new Date()) throw new Error("The retention-review deadline has not been reached.");
  if (action === "ANONYMIZE" && retention.legalHoldUntil && retention.legalHoldUntil > new Date()) throw new Error("This record is under an active legal hold.");

  if (action === "LEGAL_HOLD") {
    const reason = value(formData, "reason");
    const until = new Date(value(formData, "until"));
    if (reason.length < 3 || !Number.isFinite(until.getTime()) || until <= new Date()) throw new Error("A future legal-hold date and reason are required.");
    if (until.getTime() > Date.now() + 3 * 366 * 86_400_000) throw new Error("A legal hold may not exceed three years. Review and renew it when justified.");
    if (type === "claim") await prisma.businessClaim.update({ where: { id }, data: { legalHoldUntil: until, legalHoldReason: reason } });
    else await prisma.businessChangeRequest.update({ where: { id }, data: { legalHoldUntil: until, legalHoldReason: reason } });
  } else if (type === "claim") {
    const anonymized = await prisma.businessClaim.updateMany({
      where: { id, anonymizedAt: null, retentionReviewAt: { lte: new Date() }, OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: new Date() } }] },
      data: { claimantUserId: null, claimantName: "Anonymized", claimantEmail: "anonymized@invalid.local", officialBusinessEmail: null, officialUrl: null, message: null, anonymizedAt: new Date(), retentionReviewAt: null, legalHoldUntil: null, legalHoldReason: null },
    });
    if (!anonymized.count) throw new Error("The claim is not eligible for anonymization.");
  } else {
    const anonymized = await prisma.businessChangeRequest.updateMany({
      where: { id, anonymizedAt: null, retentionReviewAt: { lte: new Date() }, OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: new Date() } }] },
      data: { submitterUserId: null, additionalContext: null, evidenceUrl: null, payload: {}, snapshot: {}, anonymizedAt: new Date(), retentionReviewAt: null, legalHoldUntil: null, legalHoldReason: null },
    });
    if (!anonymized.count) throw new Error("The change request is not eligible for anonymization.");
  }
  await audit(actor.id, `retention.${action.toLowerCase()}`, type === "claim" ? "BusinessClaim" : "BusinessChangeRequest", id);
  revalidatePath("/admin/retention");
}

export async function updateContactMessageStatus(formData: FormData) {
  const actor = await requireAdmin();
  const id = value(formData, "id");
  const status = value(formData, "status") as "NEW" | "READ" | "ARCHIVED";
  if (!id || status !== "ARCHIVED") throw new Error("Administrators may only archive contact messages.");

  await prisma.contactMessage.update({ where: { id }, data: { status } });
  await audit(actor.id, "message.status", "ContactMessage", id, { status });
  refreshAdmin();
}

export async function updateTicketStatus(formData: FormData) {
  const actor = await requireAdmin();
  const id = value(formData, "id");
  const status = value(formData, "status") as "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  const priority = value(formData, "priority") as "LOW" | "NORMAL" | "HIGH" | "URGENT";
  if (!id || !["OPEN", "PENDING", "RESOLVED", "CLOSED"].includes(status) || !["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority)) {
    throw new Error("Invalid ticket update.");
  }

  await prisma.supportTicket.update({ where: { id }, data: { status, priority, assignedToId: actor.id } });
  await audit(actor.id, "ticket.update", "SupportTicket", id, { status, priority });
  refreshAdmin();
}

export async function replyToTicket(formData: FormData) {
  const actor = await requireAdmin();
  const ticketId = value(formData, "ticketId");
  const message = value(formData, "message");
  if (!ticketId || message.length < 2 || message.length > 4000) throw new Error("Please enter a valid reply.");
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true, status: true } });
  if (!ticket) throw new Error("Ticket not found.");
  if (ticket.status === "CLOSED") throw new Error("Reopen the ticket before replying.");
  await prisma.$transaction([
    prisma.supportTicketReply.create({ data: { ticketId, authorId: actor.id, message } }),
    prisma.supportTicket.update({ where: { id: ticketId }, data: { status: "PENDING", assignedToId: actor.id } }),
  ]);
  await audit(actor.id, "ticket.reply", "SupportTicket", ticketId);
  refreshAdmin();
  revalidatePath("/dashboard/owner/support");
}

export async function updateAdminSetting(formData: FormData) {
  const actor = await requireSuperAdmin();
  const key = value(formData, "key");
  const type = value(formData, "type");
  if (!key) throw new Error("Setting key is required.");

  const settingValue: Prisma.InputJsonValue = type === "boolean"
    ? booleanValue(formData, "value")
    : value(formData, "value");

  await prisma.adminSetting.upsert({
    where: { key },
    update: { value: settingValue, updatedById: actor.id },
    create: { key, value: settingValue, updatedById: actor.id },
  });
  await audit(actor.id, "setting.update", "AdminSetting", key, { value: settingValue });
  refreshAdmin();
}

export async function addClaimNote(formData: FormData) {
  const actor = await requireAdmin();
  const claimId = value(formData, "claimId");
  const content = value(formData, "content");
  if (!claimId || !content || content.trim().length < 1) throw new Error("Claim ID and content are required.");

  const claim = await prisma.businessClaim.findUnique({
    where: { id: claimId },
    select: { id: true, status: true },
  });
  if (!claim) throw new Error("Claim not found.");

  await prisma.claimNote.create({
    data: {
      claimId,
      authorId: actor.id,
      content: content.trim(),
      isAdminNote: true,
    },
  });

  await audit(actor.id, "claim.note_added", "BusinessClaim", claimId, { contentLength: content.trim().length });
  refreshAdmin();
}
