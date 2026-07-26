"use server";

import type { DayOfWeek, Prisma } from "@fargo/database";
import { revalidatePath } from "next/cache";
import { redirectWithLocale } from "@/i18n/server";
import { requireUserId } from "@/lib/auth-user";
import { businessAttributeDefinitionSelect, extractBusinessAttributeValues, syncBusinessAttributes } from "@/lib/business-attributes";
import { businessChangeSnapshot, parseChangePayload } from "@/lib/business-change-requests";
import { selectedTagIds, syncBusinessTags } from "@/lib/business-tags";
import { prisma } from "@/lib/prisma";
import { ownerBusinessWizardSchema } from "@/lib/owner-business-validation";

export async function openOwnerContactMessage(formData: FormData) {
  const userId = await requireUserId();
  const id = value(formData, "id");
  const message = await prisma.contactMessage.findFirst({
    where: { id, business: { ownerId: userId } },
    select: { id: true, status: true },
  });
  if (!message) throw new Error("Message not found.");
  if (message.status === "NEW") {
    await prisma.contactMessage.update({ where: { id }, data: { status: "READ", ownerViewedAt: new Date() } });
  }
  await redirectWithLocale(`/dashboard/owner/messages?messageId=${encodeURIComponent(id)}`);
}

export async function archiveOwnerContactMessage(formData: FormData) {
  const userId = await requireUserId();
  const id = value(formData, "id");
  const result = await prisma.contactMessage.updateMany({
    where: { id, business: { ownerId: userId } },
    data: { status: "ARCHIVED" },
  });
  if (!result.count) throw new Error("Message not found.");
  revalidatePath("/dashboard/owner/messages");
}

const locales = ["DE", "EN", "FA"] as const;
const daysOfWeek: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function nullableValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  return raw || null;
}

function intValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

function numberValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function validateTaxonomySelection(categoryId: number, subCategoryId: number | null, specialtyId: number | null) {
  if (!subCategoryId) {
    if (specialtyId) throw new Error("لطفاً قبل از انتخاب تخصص، زیردسته‌بندی را انتخاب کنید.");
    return { subCategoryId: null, specialtyId: null };
  }

  const subCategory = await prisma.subCategory.findFirst({
    where: { id: subCategoryId, categoryId, active: true },
    select: { id: true },
  });

  if (!subCategory) {
    if (!specialtyId) return { subCategoryId: null, specialtyId: null };
    throw new Error("زیردسته‌بندی انتخاب‌شده با دسته‌بندی اصلی مطابقت ندارد.");
  }

  if (specialtyId) {
    const specialty = await prisma.specialty.findFirst({
      where: { id: specialtyId, subCategoryId, active: true },
      select: { id: true },
    });
    if (!specialty) throw new Error("تخصص انتخاب‌شده با این زیردسته‌بندی مطابقت ندارد.");
  }

  return { subCategoryId, specialtyId };
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

async function ownerAudit(actorId: string, action: string, entityType: string, entityId?: string | null, metadata?: Prisma.InputJsonValue) {
  await prisma.adminAuditLog.create({
    data: { actorId, action, entityType, entityId, metadata },
  });
}

type OwnerChangeKind = "DETAILS" | "HOURS" | "ATTRIBUTES" | "TAGS" | "SERVICE_CREATE" | "SERVICE_UPDATE" | "SERVICE_DEACTIVATE";

async function submitOwnerChangeRequest(userId: string, businessId: string, kind: OwnerChangeKind, rawPayload: unknown) {
  const payload = parseChangePayload(kind, rawPayload);
  const snapshot = await businessChangeSnapshot(businessId);
  if (!snapshot || snapshot.ownerId !== userId) throw new Error("You can only suggest changes for your own businesses.");
  if (snapshot.removedAt) throw new Error("Restore this business before suggesting changes.");

  const active = await prisma.businessChangeRequest.findFirst({
    where: { businessId, submitterUserId: userId, kind, status: "PENDING" },
    select: { id: true },
  });
  if (active) throw new Error("A change request of this type is already awaiting review.");

  const request = await prisma.businessChangeRequest.create({
    data: {
      businessId,
      submitterUserId: userId,
      submitterRelation: "OWNER",
      kind,
      payload: payload as Prisma.InputJsonValue,
      snapshot: snapshot as Prisma.InputJsonValue,
      businessUpdatedAt: new Date(snapshot.updatedAt),
    },
    select: { id: true },
  });
  await ownerAudit(userId, "owner.business_change_request.create", "BusinessChangeRequest", request.id, { businessId, kind });
  revalidatePath("/dashboard/owner");
  revalidatePath("/admin/change-requests");
  return request;
}

async function requireOwner(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, _count: { select: { businesses: true } } },
  });
  if (!user || (user.role === "USER" && user._count.businesses === 0)) {
    throw new Error("Support tickets are available to business owners.");
  }
}

export async function createSupportTicket(formData: FormData) {
  const userId = await requireUserId();
  await requireOwner(userId);
  const subject = value(formData, "subject");
  const message = value(formData, "message");
  if (subject.length < 3 || subject.length > 160 || message.length < 10 || message.length > 4000) {
    throw new Error("Please check the ticket subject and message.");
  }
  const ticket = await prisma.supportTicket.create({
    data: { userId, subject, message, priority: "NORMAL" },
    select: { id: true },
  });
  await ownerAudit(userId, "owner.ticket.create", "SupportTicket", ticket.id);
  revalidatePath("/dashboard/owner/support");
  await redirectWithLocale(`/dashboard/owner/support?ticketId=${encodeURIComponent(ticket.id)}`);
}

export async function replyToSupportTicket(formData: FormData) {
  const userId = await requireUserId();
  await requireOwner(userId);
  const ticketId = value(formData, "ticketId");
  const message = value(formData, "message");
  if (!ticketId || message.length < 2 || message.length > 4000) throw new Error("Please enter a valid reply.");
  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, userId }, select: { id: true, status: true } });
  if (!ticket) throw new Error("Ticket not found.");
  if (ticket.status === "CLOSED") throw new Error("Closed tickets cannot receive replies.");
  await prisma.$transaction([
    prisma.supportTicketReply.create({ data: { ticketId, authorId: userId, message } }),
    prisma.supportTicket.update({ where: { id: ticketId }, data: { status: "OPEN" } }),
  ]);
  await ownerAudit(userId, "owner.ticket.reply", "SupportTicket", ticketId);
  revalidatePath("/dashboard/owner/support");
}

export async function closeSupportTicket(formData: FormData) {
  const userId = await requireUserId();
  const ticketId = value(formData, "ticketId");
  const result = await prisma.supportTicket.updateMany({ where: { id: ticketId, userId }, data: { status: "CLOSED" } });
  if (!result.count) throw new Error("Ticket not found.");
  await ownerAudit(userId, "owner.ticket.close", "SupportTicket", ticketId);
  revalidatePath("/dashboard/owner/support");
}

export async function createOwnerBusiness(formData: FormData) {
  const userId = await requireUserId();
  if (value(formData, "submissionIntent") !== "owner-business-final-submit") return;
  const slug = value(formData, "slug");
  const sourceLocale = value(formData, "sourceLocale") as "DE" | "EN" | "FA";
  const categoryId = intValue(formData, "categoryId");
  const cityId = intValue(formData, "cityId");
  const subCategoryId = intValue(formData, "subCategoryId");
  const specialtyId = intValue(formData, "specialtyId");

  const validation = ownerBusinessWizardSchema(sourceLocale, "en").safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!validation.success) throw new Error(validation.error.issues[0]?.message ?? "Business information is invalid.");
  if (!locales.includes(sourceLocale) || !categoryId || !cityId) throw new Error("Business information is invalid.");
  await validateTaxonomySelection(categoryId, subCategoryId, specialtyId);

  // Auto-resolve slug collisions by appending a numeric suffix
  let finalSlug = slug;
  const duplicates = await prisma.business.findMany({
    where: { slug: { startsWith: slug } },
    select: { slug: true },
  });
  if (duplicates.length > 0) {
    const existingSlugs = new Set(duplicates.map((b) => b.slug));
    if (existingSlugs.has(slug)) {
      let counter = 2;
      while (existingSlugs.has(`${slug}-${counter}`)) counter++;
      finalSlug = `${slug}-${counter}`;
    }
  }

  const translations = locales.map((locale) => ({
    locale,
    businessName: value(formData, `businessName_${locale}`),
    shortDescription: nullableValue(formData, `shortDescription_${locale}`),
    description: nullableValue(formData, `description_${locale}`),
  })).filter((translation) => translation.businessName);

  const source = translations.find((translation) => translation.locale === sourceLocale) ?? translations[0];
  if (!source) throw new Error("At least one business name is required.");

  const email = nullableValue(formData, "email");
  const phone = nullableValue(formData, "phone");
  const mobile = nullableValue(formData, "mobile");
  const website = nullableValue(formData, "website");
  const postalCode = nullableValue(formData, "postalCode");
  const googlePlaceId = nullableValue(formData, "googlePlaceId");
  const latitude = numberValue(formData, "latitude");
  const longitude = numberValue(formData, "longitude");

  const business = await prisma.$transaction(async (tx) => {
    // Collect uploaded image URLs (multiple hidden inputs named "imageUrl")
    const imageUrls = formData.getAll("imageUrl").filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
    const coverImageUrl = nullableValue(formData, "coverImageUrl") ?? imageUrls[0] ?? null;

    const created = await tx.business.create({
      data: {
        ownerId: userId,
        slug: finalSlug,
        sourceLocale,
        businessName: source.businessName,
        shortDescription: source.shortDescription,
        description: source.description,
        legalName: nullableValue(formData, "legalName"),
        categoryId,
        subCategoryId,
        specialtyId,
        cityId,
        districtId: intValue(formData, "districtId"),
        latitude,
        longitude,
        address: nullableValue(formData, "address"),
        postalCode,
        email,
        phone,
        mobile,
        website,
        googlePlaceId,
        coverImageUrl,
        status: "PENDING",
        verified: false,
        featured: false,
        businessHours: {
          create: businessHoursCreateData(formData),
        },
        images: imageUrls.length > 0 ? {
          create: imageUrls.map((url, index) => ({ imageUrl: url, sortOrder: index })),
        } : undefined,
        translations: {
          create: translations.map((translation) => ({
            locale: translation.locale,
            businessName: translation.businessName,
            shortDescription: translation.shortDescription,
            description: translation.description,
          })),
        },
      },
      select: { id: true, slug: true },
    });
    const attributeDefinitions = await tx.attributeDefinition.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
      select: businessAttributeDefinitionSelect,
    });
    await syncBusinessAttributes(tx, created.id, attributeDefinitions, formData);
    await syncBusinessTags(tx, created.id, formData);

    await tx.user.update({
      where: { id: userId },
      data: { role: "OWNER" },
    });

    return created;
  });

  await ownerAudit(userId, "owner.business.create", "Business", business.id, { status: "PENDING", sourceLocale });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
  await redirectWithLocale("/dashboard/owner");
}

export async function upsertReviewOwnerReply(formData: FormData) {
  const userId = await requireUserId();
  const reviewId = value(formData, "reviewId");
  const content = value(formData, "content");
  if (!reviewId) throw new Error("Review is required.");

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      businessId: true,
      business: { select: { ownerId: true, slug: true } },
    },
  });

  if (!review || review.business.ownerId !== userId) throw new Error("You can only reply to reviews for your own businesses.");

  if (!content) {
    await prisma.reviewOwnerReply.deleteMany({ where: { reviewId } });
    await ownerAudit(userId, "owner.review_reply.delete", "Review", reviewId, { businessId: review.businessId });
  } else {
    await prisma.reviewOwnerReply.upsert({
      where: { reviewId },
      update: { content, ownerId: userId },
      create: { reviewId, ownerId: userId, content },
    });
    await ownerAudit(userId, "owner.review_reply.upsert", "Review", reviewId, { businessId: review.businessId });
  }

  revalidatePath("/dashboard/owner");
  revalidatePath(`/businesses/${review.business.slug}`);
}

export async function updateOwnerBusinessHours(formData: FormData) {
  const userId = await requireUserId();
  const businessId = value(formData, "businessId");
  if (!businessId) throw new Error("Business is required.");

  await submitOwnerChangeRequest(userId, businessId, "HOURS", { hours: businessHoursCreateData(formData) });
}

export async function updateOwnerBusinessAttributes(formData: FormData) {
  const userId = await requireUserId();
  const businessId = value(formData, "businessId");
  if (!businessId) throw new Error("Business is required.");

  const definitions = await prisma.attributeDefinition.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
    select: businessAttributeDefinitionSelect,
  });
  await submitOwnerChangeRequest(userId, businessId, "ATTRIBUTES", { attributes: extractBusinessAttributeValues(formData, definitions) });
}

export async function updateOwnerBusinessTags(formData: FormData) {
  const userId = await requireUserId();
  const businessId = value(formData, "businessId");
  if (!businessId) throw new Error("Business is required.");

  await submitOwnerChangeRequest(userId, businessId, "TAGS", { tagIds: selectedTagIds(formData) });
}

export async function updateOwnerBusinessDetails(formData: FormData) {
  const userId = await requireUserId();
  const businessId = value(formData, "businessId");
  const fields = [
    "businessName", "shortDescription", "description", "legalName", "email", "phone", "mobile", "website", "address",
    "postalCode", "categoryId", "subCategoryId", "specialtyId", "cityId", "districtId", "latitude", "longitude", "establishedYear", "priceRange",
  ] as const;
  if (!businessId) throw new Error("Business is required.");
  const translations = locales.flatMap((locale) => {
    const businessName = value(formData, `translation_${locale}_businessName`);
    if (!businessName) return [];
    return [{
      locale,
      businessName,
      shortDescription: nullableValue(formData, `translation_${locale}_shortDescription`),
      description: nullableValue(formData, `translation_${locale}_description`),
    }];
  });
  await submitOwnerChangeRequest(userId, businessId, "DETAILS", {
    changes: fields.map((field) => ({ field, value: value(formData, field) })),
    translations,
  });
}

export async function createOwnerServiceChange(formData: FormData) {
  const userId = await requireUserId();
  const businessId = value(formData, "businessId");
  if (!businessId) throw new Error("Business is required.");
  await submitOwnerChangeRequest(userId, businessId, "SERVICE_CREATE", {
    title: value(formData, "title"),
    description: nullableValue(formData, "description"),
    price: numberValue(formData, "price"),
    currency: value(formData, "currency") || "EUR",
    duration: intValue(formData, "duration"),
    unit: nullableValue(formData, "unit"),
    sortOrder: intValue(formData, "sortOrder") || 0,
  });
}

export async function updateOwnerServiceChange(formData: FormData) {
  const userId = await requireUserId();
  const businessId = value(formData, "businessId");
  const serviceId = value(formData, "serviceId");
  if (!businessId || !serviceId) throw new Error("Business and service are required.");
  await submitOwnerChangeRequest(userId, businessId, "SERVICE_UPDATE", {
    serviceId,
    title: value(formData, "title"),
    description: nullableValue(formData, "description"),
    price: numberValue(formData, "price"),
    currency: value(formData, "currency") || "EUR",
    duration: intValue(formData, "duration"),
    unit: nullableValue(formData, "unit"),
    sortOrder: intValue(formData, "sortOrder") || 0,
  });
}

export async function deactivateOwnerServiceChange(formData: FormData) {
  const userId = await requireUserId();
  const businessId = value(formData, "businessId");
  const serviceId = value(formData, "serviceId");
  if (!businessId || !serviceId) throw new Error("Business and service are required.");
  await submitOwnerChangeRequest(userId, businessId, "SERVICE_DEACTIVATE", { serviceId });
}

export async function removeOwnerBusiness(formData: FormData) {
  const userId = await requireUserId();
  const businessId = value(formData, "businessId");
  const confirmName = value(formData, "confirmName");
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true, slug: true, businessName: true, ownerId: true, removedAt: true } });
  if (!business || business.ownerId !== userId) throw new Error("You can only remove your own business.");
  if (confirmName !== business.businessName) throw new Error("Enter the exact business name to confirm removal.");
  if (!business.removedAt) {
    await prisma.$transaction([
      prisma.business.update({ where: { id: business.id }, data: { removedAt: new Date(), removedById: userId, restoredAt: null } }),
      prisma.adminAuditLog.create({ data: { actorId: userId, action: "business.remove", entityType: "Business", entityId: business.id, metadata: { source: "owner-dashboard" } } }),
    ]);
  }
  revalidatePath("/dashboard/owner");
  revalidatePath(`/businesses/${business.slug}`);
  await redirectWithLocale(`/dashboard/owner?businessId=${encodeURIComponent(business.id)}&removed=1`);
}

export async function restoreOwnerBusiness(formData: FormData) {
  const userId = await requireUserId();
  const businessId = value(formData, "businessId");
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true, slug: true, ownerId: true, removedAt: true } });
  if (!business || business.ownerId !== userId) throw new Error("You can only restore your own business.");
  if (business.removedAt) {
    await prisma.$transaction([
      prisma.business.update({ where: { id: business.id }, data: { removedAt: null, removedById: null, restoredAt: new Date() } }),
      prisma.adminAuditLog.create({ data: { actorId: userId, action: "business.restore", entityType: "Business", entityId: business.id, metadata: { source: "owner-dashboard" } } }),
    ]);
  }
  revalidatePath("/dashboard/owner");
  revalidatePath(`/businesses/${business.slug}`);
}
