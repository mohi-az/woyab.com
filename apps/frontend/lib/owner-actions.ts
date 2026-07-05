"use server";

import type { Prisma } from "@fargo/database";
import { revalidatePath } from "next/cache";
import { redirectWithLocale } from "@/i18n/server";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

const locales = ["DE", "EN", "FA"] as const;

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function nullableValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  return raw || null;
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

async function ownerAudit(actorId: string, action: string, entityType: string, entityId?: string | null, metadata?: Prisma.InputJsonValue) {
  await prisma.adminAuditLog.create({
    data: { actorId, action, entityType, entityId, metadata },
  });
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
