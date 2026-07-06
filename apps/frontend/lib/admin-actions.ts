"use server";

import type { BusinessStatus, Prisma, ReviewStatus, UserRole } from "@fargo/database";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const businessStatuses: BusinessStatus[] = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED", "REJECTED"];
const reviewStatuses: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED"];
const userRoles: UserRole[] = ["USER", "OWNER", "ADMIN", "SUPER_ADMIN"];
const claimStatuses = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function nullableValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  return raw || null;
}

function booleanValue(formData: FormData, key: string) {
  return value(formData, key) === "true" || formData.get(key) === "on";
}

function intValue(formData: FormData, key: string) {
  const parsed = Number(value(formData, key));
  return Number.isInteger(parsed) ? parsed : null;
}

function numberValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
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
  revalidatePath("/businesses", "layout");
  revalidatePath("/dashboard", "layout");
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
  const specialtyId = intValue(formData, "specialtyId");
  const status = value(formData, "status") as BusinessStatus;
  const ownerId = nullableValue(formData, "ownerId");

  if (!["DE", "EN", "FA"].includes(sourceLocale) || !categoryId || !cityId || !businessStatuses.includes(status)) {
    throw new Error("Please check the required business fields.");
  }

  if (ownerId) {
    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, active: true } });
    if (!owner?.active) throw new Error("Selected owner is not an active user.");
  }

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
        subCategoryId,
        specialtyId,
        ownerId,
        cityId,
        districtId: intValue(formData, "districtId"),
        latitude: numberValue(formData, "latitude"),
        longitude: numberValue(formData, "longitude"),
        address: nullableValue(formData, "address"),
        postalCode: nullableValue(formData, "postalCode"),
        email: nullableValue(formData, "email"),
        phone: nullableValue(formData, "phone"),
        mobile: nullableValue(formData, "mobile"),
        website: nullableValue(formData, "website"),
        status,
        verified: booleanValue(formData, "verified"),
        featured: booleanValue(formData, "featured"),
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
    if (ownerId) await promoteUserToOwner(tx, ownerId);
  });

  await audit(actor.id, "business.update", "Business", businessId, { status, sourceLocale, ownerId });
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
  const specialtyId = intValue(formData, "specialtyId");
  const status = value(formData, "status") as BusinessStatus;
  const ownerId = nullableValue(formData, "ownerId");

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error("A valid slug is required.");
  if (!["DE", "EN", "FA"].includes(sourceLocale) || !categoryId || !cityId || !businessStatuses.includes(status)) {
    throw new Error("Please check the required business fields.");
  }

  if (ownerId) {
    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, active: true } });
    if (!owner?.active) throw new Error("Selected owner is not an active user.");
  }

  const duplicate = await prisma.business.findUnique({ where: { slug }, select: { id: true } });
  if (duplicate) throw new Error("This business slug already exists.");

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
        subCategoryId,
        specialtyId,
        ownerId,
        cityId,
        districtId: intValue(formData, "districtId"),
        latitude: numberValue(formData, "latitude"),
        longitude: numberValue(formData, "longitude"),
        address: nullableValue(formData, "address"),
        postalCode: nullableValue(formData, "postalCode"),
        email: nullableValue(formData, "email"),
        phone: nullableValue(formData, "phone"),
        mobile: nullableValue(formData, "mobile"),
        website: nullableValue(formData, "website"),
        status,
        verified: booleanValue(formData, "verified"),
        featured: booleanValue(formData, "featured"),
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
    if (ownerId) await promoteUserToOwner(tx, ownerId);
    return created;
  });

  await audit(actor.id, "business.create", "Business", business.id, { status, sourceLocale, ownerId });
  refreshAdmin();
}

export async function setReviewStatus(formData: FormData) {
  const actor = await requireAdmin();
  const reviewId = value(formData, "reviewId");
  const status = value(formData, "status") as ReviewStatus;
  if (!reviewId || !reviewStatuses.includes(status)) throw new Error("Invalid review status.");

  const review = await prisma.$transaction(async (tx) => {
    const updated = await tx.review.update({ where: { id: reviewId }, data: { status } });
    await recalculateBusinessRating(tx, updated.businessId);
    return updated;
  });

  await audit(actor.id, "review.status", "Review", reviewId, { status, businessId: review.businessId });
  refreshAdmin();
}

export async function setReviewVerified(formData: FormData) {
  const actor = await requireAdmin();
  const reviewId = value(formData, "reviewId");
  const verified = booleanValue(formData, "verified");
  if (!reviewId) throw new Error("Review is required.");

  await prisma.review.update({ where: { id: reviewId }, data: { verified } });
  await audit(actor.id, "review.verified", "Review", reviewId, { verified });
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
  const actor = await requireAdmin();
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
}

export async function updateSubCategory(formData: FormData) {
  const actor = await requireAdmin();
  const id = intValue(formData, "id");
  if (!id) throw new Error("Subcategory is required.");

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
}

export async function updateSpecialty(formData: FormData) {
  const actor = await requireAdmin();
  const id = intValue(formData, "id");
  if (!id) throw new Error("Specialty is required.");

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
}

export async function updateReportStatus(formData: FormData) {
  const actor = await requireAdmin();
  const id = value(formData, "id");
  const status = value(formData, "status") as "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";
  if (!id || !["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"].includes(status)) throw new Error("Invalid report status.");
  const moderatorNote = nullableValue(formData, "moderatorNote");
  const decisionReason = nullableValue(formData, "decisionReason");
  const actionTaken = nullableValue(formData, "actionTaken");

  await prisma.directoryReport.update({
    where: { id },
    data: {
      status,
      resolvedById: ["RESOLVED", "DISMISSED"].includes(status) ? actor.id : null,
      resolvedAt: ["RESOLVED", "DISMISSED"].includes(status) ? new Date() : null,
      moderatorNote,
      decisionReason,
      actionTaken,
    },
  });
  await audit(actor.id, "report.status", "DirectoryReport", id, { status, decisionReason, actionTaken });
  refreshAdmin();
}

export async function updateClaimStatus(formData: FormData) {
  const actor = await requireAdmin();
  const id = value(formData, "id");
  const status = value(formData, "status") as (typeof claimStatuses)[number];
  if (!id || !claimStatuses.includes(status)) throw new Error("Invalid claim status.");

  const claim = await prisma.$transaction(async (tx) => {
    const existing = await tx.businessClaim.findUniqueOrThrow({
      where: { id },
      select: { businessId: true, claimantUserId: true },
    });
    if (status === "APPROVED") {
      if (!existing.claimantUserId) throw new Error("Approved claims must belong to a registered user.");
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
      },
    });
    return existing;
  });
  await audit(actor.id, "claim.status", "BusinessClaim", id, {
    status,
    businessId: claim.businessId,
    ownerId: status === "APPROVED" ? claim.claimantUserId : null,
  });
  refreshAdmin();
}

export async function updateContactMessageStatus(formData: FormData) {
  const actor = await requireAdmin();
  const id = value(formData, "id");
  const status = value(formData, "status") as "NEW" | "READ" | "ARCHIVED";
  if (!id || !["NEW", "READ", "ARCHIVED"].includes(status)) throw new Error("Invalid message status.");

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

export async function updateAdminSetting(formData: FormData) {
  const actor = await requireAdmin();
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
