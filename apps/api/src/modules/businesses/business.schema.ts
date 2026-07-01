import { z } from "zod";

import { paginationQuerySchema } from "@fargo/shared";
export { businessMapBodySchema, businessSearchBodySchema } from "@fargo/shared";

export const createBusinessBodySchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  businessName: z.string().min(1),
  legalName: z.string().optional(),
  shortDescription: z.string().max(300).optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  categoryId: z.number().int().positive(),
  subCategoryId: z.number().int().positive().optional(),
  specialtyId: z.number().int().positive().optional(),
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

export const listBusinessesQuerySchema = paginationQuerySchema.extend({
  categoryId: z.coerce.number().int().positive().optional(),
  subCategoryId: z.coerce.number().int().positive().optional(),
  cityId: z.coerce.number().int().positive().optional(),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "CLOSED", "REJECTED"]).optional(),
  featured: z.enum(["true", "false"]).optional(),
  verified: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["latest"]).optional(),
});

export type CreateBusinessBody = z.infer<typeof createBusinessBodySchema>;
export type UpdateBusinessBody = z.infer<typeof updateBusinessBodySchema>;
export type ListBusinessesQuery = z.infer<typeof listBusinessesQuerySchema>;
