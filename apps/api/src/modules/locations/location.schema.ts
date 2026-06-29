import { z } from "zod";

import { paginationQuerySchema } from "@fargo/shared";

// ─── Country ─────────────────────────────────────────────────────────────────

export const createCountryBodySchema = z.object({
  nameFa: z.string().min(1),
  nameEn: z.string().min(1),
  code: z.string().length(2).toUpperCase(),
  active: z.boolean().default(true),
});

export const updateCountryBodySchema = createCountryBodySchema.partial();

export const countryIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ─── Province ────────────────────────────────────────────────────────────────

export const createProvinceBodySchema = z.object({
  nameFa: z.string().min(1),
  nameEn: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  countryId: z.number().int().positive(),
});

export const updateProvinceBodySchema = createProvinceBodySchema.partial();

export const provinceIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listProvincesQuerySchema = paginationQuerySchema.extend({
  countryId: z.coerce.number().int().positive().optional(),
});

// ─── City ────────────────────────────────────────────────────────────────────

export const createCityBodySchema = z.object({
  nameFa: z.string().min(1),
  nameEn: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  provinceId: z.number().int().positive(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const updateCityBodySchema = createCityBodySchema.partial();

export const cityIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listCitiesQuerySchema = paginationQuerySchema.extend({
  provinceId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
});

// ─── District ────────────────────────────────────────────────────────────────

export const createDistrictBodySchema = z.object({
  nameFa: z.string().min(1),
  nameEn: z.string().optional(),
  cityId: z.number().int().positive(),
});

export const updateDistrictBodySchema = createDistrictBodySchema.partial();

export const districtIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listDistrictsQuerySchema = paginationQuerySchema.extend({
  cityId: z.coerce.number().int().positive().optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateCountryBody = z.infer<typeof createCountryBodySchema>;
export type UpdateCountryBody = z.infer<typeof updateCountryBodySchema>;

export type CreateProvinceBody = z.infer<typeof createProvinceBodySchema>;
export type UpdateProvinceBody = z.infer<typeof updateProvinceBodySchema>;
export type ListProvincesQuery = z.infer<typeof listProvincesQuerySchema>;

export type CreateCityBody = z.infer<typeof createCityBodySchema>;
export type UpdateCityBody = z.infer<typeof updateCityBodySchema>;
export type ListCitiesQuery = z.infer<typeof listCitiesQuerySchema>;

export type CreateDistrictBody = z.infer<typeof createDistrictBodySchema>;
export type UpdateDistrictBody = z.infer<typeof updateDistrictBodySchema>;
export type ListDistrictsQuery = z.infer<typeof listDistrictsQuerySchema>;
