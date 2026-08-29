import { z } from "zod";

import { appLocaleSchema, paginationQuerySchema } from "@woyab/shared";
export { businessMapBodySchema, businessSearchBodySchema } from "@woyab/shared";

const businessTranslationInputSchema = z.object({
  locale: appLocaleSchema,
  businessName: z.string().min(1),
  shortDescription: z.string().max(300).optional(),
  description: z.string().optional(),
});

const businessAttributeInputSchema = z.object({
  attributeId: z.number().int().positive(),
  value: z.string().min(1).max(500),
});

const tagIdsQuerySchema = z.preprocess((value) => {
  if (value === undefined) return undefined;
  const rawValues = Array.isArray(value) ? value : [value];
  return rawValues.flatMap((item) => String(item).split(",")).filter(Boolean).map(Number);
}, z.array(z.number().int().positive()).max(100).optional());

export const createBusinessBodySchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  businessName: z.string().min(1),
  sourceLocale: appLocaleSchema.optional(),
  legalName: z.string().optional(),
  shortDescription: z.string().max(300).optional(),
  description: z.string().optional(),
  translations: z.array(businessTranslationInputSchema).max(3).optional(),
  attributes: z.array(businessAttributeInputSchema).max(100).optional(),
  tagIds: z.array(z.number().int().positive()).max(100).optional(),
  logoUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  googlePlaceId: z.string().optional(),
  categoryId: z.number().int().positive(),
  subCategoryId: z.number().int().positive().optional(),
  ownerId: z.string().optional(),
  establishedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  priceRange: z.enum(["BUDGET", "MODERATE", "EXPENSIVE", "LUXURY"]).optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
  telegram: z.string().optional(),
  facebook: z.string().optional(),
  youtube: z.string().optional(),
  linkedin: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  cityId: z.number().int().positive(),
  districtId: z.number().int().positive().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "CLOSED", "REJECTED"]).optional(),
  verified: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export const updateBusinessBodySchema = createBusinessBodySchema.partial();

export const businessIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const businessSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const businessLocaleQuerySchema = z.object({
  locale: appLocaleSchema.default("de"),
});

export const listBusinessesQuerySchema = paginationQuerySchema.extend({
  locale: appLocaleSchema.default("de"),
  categoryId: z.coerce.number().int().positive().optional(),
  subCategoryId: z.coerce.number().int().positive().optional(),
  tagIds: tagIdsQuerySchema,
  cityId: z.coerce.number().int().positive().optional(),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "CLOSED", "REJECTED"]).optional(),
  featured: z.enum(["true", "false"]).optional(),
  verified: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["latest", "oldest", "popular"]).optional(),
  openNow: z.enum(["true", "false"]).optional(),
});

export type CreateBusinessBody = z.infer<typeof createBusinessBodySchema>;
export type UpdateBusinessBody = z.infer<typeof updateBusinessBodySchema>;
export type ListBusinessesQuery = z.infer<typeof listBusinessesQuerySchema>;
