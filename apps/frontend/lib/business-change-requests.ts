import "server-only";

import type { Prisma } from "@fargo/database";
import { publicBusinessDetailsChangeSchema } from "@fargo/shared";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const daySchema = z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);

const hoursPayloadSchema = z.object({
  hours: z.array(z.object({
    dayOfWeek: daySchema,
    openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
    closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
    isClosed: z.boolean(),
    note: z.string().trim().max(240).nullable(),
  })).max(7),
});

const attributesPayloadSchema = z.object({
  attributes: z.array(z.object({ attributeId: z.number().int().positive(), value: z.string().trim().min(1).max(500) })).max(100),
});

const tagsPayloadSchema = z.object({ tagIds: z.array(z.number().int().positive()).max(100) });
const serviceCreatePayloadSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  currency: z.string().trim().length(3).default("EUR"),
  duration: z.number().int().positive().nullable().optional(),
  unit: z.string().trim().max(60).nullable().optional(),
  sortOrder: z.number().int().default(0),
});
const serviceUpdatePayloadSchema = serviceCreatePayloadSchema.partial().extend({ serviceId: z.string().min(1) });
const serviceDeactivatePayloadSchema = z.object({ serviceId: z.string().min(1) });

const contactEmailFields = new Set(["email"]);
const urlFields = new Set(["website", "instagram", "telegram", "facebook", "youtube", "linkedin"]);
const integerFields = new Set(["categoryId", "subCategoryId", "specialtyId", "cityId", "districtId", "establishedYear"]);

export function parseChangePayload(kind: string, payload: unknown) {
  switch (kind) {
    case "DETAILS": {
      const parsed = publicBusinessDetailsChangeSchema.parse(payload);
      const unique = new Set<string>();
      for (const change of parsed.changes) {
        if (unique.has(change.field)) throw new Error(`Duplicate change field: ${change.field}`);
        unique.add(change.field);
        if (contactEmailFields.has(change.field) && change.value && !z.email().safeParse(change.value).success) throw new Error("Enter a valid business email.");
        if (urlFields.has(change.field) && change.value && !z.url().safeParse(change.value).success) throw new Error(`Enter a valid URL for ${change.field}.`);
        if (integerFields.has(change.field) && change.value && (!Number.isInteger(Number(change.value)) || Number(change.value) <= 0)) throw new Error(`Enter a valid integer for ${change.field}.`);
        if (["categoryId", "cityId"].includes(change.field) && !change.value) throw new Error(`${change.field} is required.`);
        if (change.field === "establishedYear" && change.value && (Number(change.value) < 1800 || Number(change.value) > 2100)) throw new Error("Enter a valid established year.");
        if (change.field === "latitude" && change.value && (!Number.isFinite(Number(change.value)) || Math.abs(Number(change.value)) > 90)) throw new Error("Enter a valid latitude.");
        if (change.field === "longitude" && change.value && (!Number.isFinite(Number(change.value)) || Math.abs(Number(change.value)) > 180)) throw new Error("Enter a valid longitude.");
        if (change.field === "priceRange" && change.value && !["BUDGET", "MODERATE", "EXPENSIVE", "LUXURY"].includes(change.value)) throw new Error("Enter a valid price range.");
      }
      const translationLocales = new Set((parsed.translations ?? []).map((translation) => translation.locale));
      if (translationLocales.size !== (parsed.translations?.length ?? 0)) throw new Error("Each translation locale may appear only once.");
      return parsed;
    }
    case "HOURS": return hoursPayloadSchema.parse(payload);
    case "ATTRIBUTES": return attributesPayloadSchema.parse(payload);
    case "TAGS": return tagsPayloadSchema.parse(payload);
    case "SERVICE_CREATE": return serviceCreatePayloadSchema.parse(payload);
    case "SERVICE_UPDATE": return serviceUpdatePayloadSchema.parse(payload);
    case "SERVICE_DEACTIVATE": return serviceDeactivatePayloadSchema.parse(payload);
    default: throw new Error("Unsupported business change request kind.");
  }
}

export async function businessChangeSnapshot(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true, updatedAt: true, ownerId: true, removedAt: true, sourceLocale: true,
      businessName: true, shortDescription: true, description: true, legalName: true,
      email: true, phone: true, mobile: true, whatsapp: true, website: true,
      instagram: true, telegram: true, facebook: true, youtube: true, linkedin: true,
      address: true, postalCode: true,
      categoryId: true, subCategoryId: true, specialtyId: true, cityId: true, districtId: true,
      latitude: true, longitude: true, establishedYear: true, priceRange: true,
      translations: { orderBy: { locale: "asc" }, select: { locale: true, businessName: true, shortDescription: true, description: true } },
      businessHours: { orderBy: { dayOfWeek: "asc" }, select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true, note: true } },
      attributes: { orderBy: { attributeId: "asc" }, select: { attributeId: true, value: true } },
      tags: { orderBy: { tagId: "asc" }, select: { tagId: true } },
      services: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, description: true, price: true, currency: true, duration: true, unit: true, active: true, sortOrder: true } },
    },
  });
  if (!business) return null;
  return JSON.parse(JSON.stringify(business, (_key, value) => typeof value === "object" && value && "toString" in value && value.constructor?.name === "Decimal" ? value.toString() : value)) as Record<string, unknown> & { id: string; ownerId: string | null; removedAt: string | null; updatedAt: string };
}

export async function applyBusinessChangeRequest(requestId: string, reviewerId: string, decisionReason: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.businessChangeRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== "PENDING") throw new Error("Change request is not pending.");
    const business = await tx.business.findUnique({ where: { id: request.businessId }, select: { id: true, updatedAt: true, sourceLocale: true, removedAt: true, categoryId: true, subCategoryId: true, specialtyId: true, cityId: true, districtId: true } });
    if (!business) throw new Error("Business not found.");
    if (business.removedAt) throw new Error("BUSINESS_REMOVED");
    if (business.updatedAt.getTime() !== request.businessUpdatedAt.getTime()) throw new Error("STALE_CHANGE_REQUEST");

    const payload = parseChangePayload(request.kind, request.payload);
    if (request.kind === "DETAILS") {
      const details = payload as z.infer<typeof publicBusinessDetailsChangeSchema>;
      const changes = details.changes;
      const data: Record<string, unknown> = {};
      for (const change of changes) {
        if (integerFields.has(change.field) || change.field === "latitude" || change.field === "longitude") data[change.field] = change.value ? Number(change.value) : null;
        else data[change.field] = change.value || null;
      }
      for (const translation of details.translations ?? []) {
        if (translation.locale === business.sourceLocale) {
          data.businessName = translation.businessName;
          data.shortDescription = translation.shortDescription ?? null;
          data.description = translation.description ?? null;
        }
      }
      const nextCategoryId = "categoryId" in data ? data.categoryId as number : business.categoryId;
      const nextSubCategoryId = "subCategoryId" in data ? data.subCategoryId as number | null : business.subCategoryId;
      const nextSpecialtyId = "specialtyId" in data ? data.specialtyId as number | null : business.specialtyId;
      const nextCityId = "cityId" in data ? data.cityId as number : business.cityId;
      const nextDistrictId = "districtId" in data ? data.districtId as number | null : business.districtId;
      const [category, city, subCategory, specialty, district] = await Promise.all([
        tx.category.findFirst({ where: { id: nextCategoryId, active: true }, select: { id: true } }),
        tx.city.findUnique({ where: { id: nextCityId }, select: { id: true } }),
        nextSubCategoryId ? tx.subCategory.findFirst({ where: { id: nextSubCategoryId, categoryId: nextCategoryId, active: true }, select: { id: true } }) : null,
        nextSpecialtyId && nextSubCategoryId ? tx.specialty.findFirst({ where: { id: nextSpecialtyId, subCategoryId: nextSubCategoryId, active: true }, select: { id: true } }) : null,
        nextDistrictId ? tx.district.findFirst({ where: { id: nextDistrictId, cityId: nextCityId }, select: { id: true } }) : null,
      ]);
      if (!category || !city) throw new Error("The requested category or city is not available.");
      if (nextSubCategoryId && !subCategory) throw new Error("The requested subcategory does not belong to the category.");
      if (nextSpecialtyId && !specialty) throw new Error("The requested specialty does not belong to the subcategory.");
      if (nextDistrictId && !district) throw new Error("The requested district does not belong to the city.");
      await tx.business.update({ where: { id: business.id }, data: data as Prisma.BusinessUncheckedUpdateInput });
      const translated = changes.filter((change) => ["businessName", "shortDescription", "description"].includes(change.field));
      if (translated.length) {
        const translationData: Record<string, string | null> = {};
        for (const change of translated) translationData[change.field] = change.value || null;
        await tx.businessTranslation.updateMany({ where: { businessId: business.id, locale: business.sourceLocale }, data: translationData });
      }
      for (const translation of details.translations ?? []) {
        await tx.businessTranslation.upsert({
          where: { businessId_locale: { businessId: business.id, locale: translation.locale } },
          update: { businessName: translation.businessName, shortDescription: translation.shortDescription ?? null, description: translation.description ?? null },
          create: { businessId: business.id, locale: translation.locale, businessName: translation.businessName, shortDescription: translation.shortDescription ?? null, description: translation.description ?? null },
        });
      }
    } else if (request.kind === "HOURS") {
      const hours = (payload as z.infer<typeof hoursPayloadSchema>).hours;
      await tx.businessHours.deleteMany({ where: { businessId: business.id } });
      if (hours.length) await tx.businessHours.createMany({ data: hours.map((hour) => ({ ...hour, businessId: business.id })) });
      await tx.business.update({ where: { id: business.id }, data: { updatedAt: new Date() } });
    } else if (request.kind === "ATTRIBUTES") {
      const attributes = (payload as z.infer<typeof attributesPayloadSchema>).attributes;
      await tx.businessAttribute.deleteMany({ where: { businessId: business.id } });
      if (attributes.length) await tx.businessAttribute.createMany({ data: attributes.map((attribute) => ({ ...attribute, businessId: business.id })) });
      await tx.business.update({ where: { id: business.id }, data: { updatedAt: new Date() } });
    } else if (request.kind === "TAGS") {
      const tagIds = [...new Set((payload as z.infer<typeof tagsPayloadSchema>).tagIds)];
      await tx.businessTag.deleteMany({ where: { businessId: business.id } });
      if (tagIds.length) await tx.businessTag.createMany({ data: tagIds.map((tagId) => ({ tagId, businessId: business.id })) });
      await tx.business.update({ where: { id: business.id }, data: { updatedAt: new Date() } });
    } else if (request.kind === "SERVICE_CREATE") {
      await tx.service.create({ data: { ...(payload as z.infer<typeof serviceCreatePayloadSchema>), businessId: business.id, active: true } });
      await tx.business.update({ where: { id: business.id }, data: { updatedAt: new Date() } });
    } else {
      const serviceId = (payload as { serviceId: string }).serviceId;
      const service = await tx.service.findFirst({ where: { id: serviceId, businessId: business.id }, select: { id: true } });
      if (!service) throw new Error("Service not found.");
      if (request.kind === "SERVICE_UPDATE") {
        const { serviceId, ...data } = payload as z.infer<typeof serviceUpdatePayloadSchema>;
        await tx.service.update({ where: { id: serviceId }, data });
      } else {
        await tx.service.update({ where: { id: service.id }, data: { active: false } });
      }
      await tx.business.update({ where: { id: business.id }, data: { updatedAt: new Date() } });
    }

    await tx.businessChangeRequest.update({
      where: { id: request.id },
      data: { status: "APPROVED", reviewedById: reviewerId, reviewedAt: new Date(), decisionReason, retentionReviewAt: new Date(Date.now() + 180 * 86_400_000) },
    });
    await tx.adminAuditLog.create({ data: { actorId: reviewerId, action: "business.change_request.approve", entityType: "BusinessChangeRequest", entityId: request.id, metadata: { businessId: request.businessId, kind: request.kind } } });
    return request;
  }, { isolationLevel: "Serializable" });
}
