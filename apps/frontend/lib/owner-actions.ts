"use server";

import type { DayOfWeek, Prisma } from "@fargo/database";
import { revalidatePath } from "next/cache";
import { redirectWithLocale } from "@/i18n/server";
import { requireUserId } from "@/lib/auth-user";
import { businessAttributeDefinitionSelect, syncBusinessAttributes } from "@/lib/business-attributes";
import { syncBusinessTags } from "@/lib/business-tags";
import { prisma } from "@/lib/prisma";

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

async function ownerAudit(actorId: string, action: string, entityType: string, entityId?: string | null, metadata?: Prisma.InputJsonValue) {
  await prisma.adminAuditLog.create({
    data: { actorId, action, entityType, entityId, metadata },
  });
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
  const slug = value(formData, "slug");
  const sourceLocale = value(formData, "sourceLocale") as "DE" | "EN" | "FA";
  const categoryId = intValue(formData, "categoryId");
  const cityId = intValue(formData, "cityId");
  const subCategoryId = intValue(formData, "subCategoryId");
  const specialtyId = intValue(formData, "specialtyId");

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error("A valid slug is required.");
  if (!locales.includes(sourceLocale) || !categoryId || !cityId) throw new Error("Please check the required business fields.");

  const duplicate = await prisma.business.findUnique({ where: { slug }, select: { id: true } });
  if (duplicate) throw new Error("This business slug already exists.");

  const translations = locales.map((locale) => ({
    locale,
    businessName: value(formData, `businessName_${locale}`),
    shortDescription: nullableValue(formData, `shortDescription_${locale}`),
    description: nullableValue(formData, `description_${locale}`),
  })).filter((translation) => translation.businessName);

  const source = translations.find((translation) => translation.locale === sourceLocale) ?? translations[0];
  if (!source) throw new Error("At least one business name is required.");

  const business = await prisma.$transaction(async (tx) => {
    const created = await tx.business.create({
      data: {
        ownerId: userId,
        slug,
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
        latitude: numberValue(formData, "latitude"),
        longitude: numberValue(formData, "longitude"),
        address: nullableValue(formData, "address"),
        postalCode: nullableValue(formData, "postalCode"),
        email: nullableValue(formData, "email"),
        phone: nullableValue(formData, "phone"),
        mobile: nullableValue(formData, "mobile"),
        website: nullableValue(formData, "website"),
        status: "PENDING",
        verified: false,
        featured: false,
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

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true, slug: true },
  });
  if (!business || business.ownerId !== userId) throw new Error("You can only edit hours for your own businesses.");

  await prisma.$transaction((tx) => syncBusinessHours(tx, businessId, formData));
  await ownerAudit(userId, "owner.business_hours.update", "Business", businessId);
  revalidatePath("/dashboard/owner");
  revalidatePath(`/businesses/${business.slug}`);
}

export async function updateOwnerBusinessAttributes(formData: FormData) {
  const userId = await requireUserId();
  const businessId = value(formData, "businessId");
  if (!businessId) throw new Error("Business is required.");

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true, slug: true },
  });
  if (!business || business.ownerId !== userId) throw new Error("You can only edit features for your own businesses.");

  await prisma.$transaction(async (tx) => {
    const attributeDefinitions = await tx.attributeDefinition.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
      select: businessAttributeDefinitionSelect,
    });
    await syncBusinessAttributes(tx, businessId, attributeDefinitions, formData);
  });
  await ownerAudit(userId, "owner.business_attributes.update", "Business", businessId);
  revalidatePath("/dashboard/owner");
  revalidatePath(`/businesses/${business.slug}`);
}

export async function updateOwnerBusinessTags(formData: FormData) {
  const userId = await requireUserId();
  const businessId = value(formData, "businessId");
  if (!businessId) throw new Error("Business is required.");

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true, slug: true },
  });
  if (!business || business.ownerId !== userId) throw new Error("You can only edit tags for your own businesses.");

  await prisma.$transaction((tx) => syncBusinessTags(tx, businessId, formData));
  await ownerAudit(userId, "owner.business_tags.update", "Business", businessId);
  revalidatePath("/dashboard/owner");
  revalidatePath(`/businesses/${business.slug}`);
}
