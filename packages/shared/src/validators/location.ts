import { z } from "zod";

import { paginationQuerySchema } from "./common.js";

export const locationSourceSchema = z.enum(["CURRENT", "MANUAL", "SAVED"]);

export const locationOriginSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.union([
    z.literal(1),
    z.literal(3),
    z.literal(5),
    z.literal(10),
    z.literal(25),
    z.literal(50),
  ]).optional(),
});

export const businessSearchBodySchema = paginationQuerySchema.extend({
  categoryId: z.number().int().positive().optional(),
  subCategoryId: z.number().int().positive().optional(),
  cityId: z.number().int().positive().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  sortBy: z.enum(["recommended", "latest", "distance"]).default("recommended"),
  origin: locationOriginSchema.optional(),
}).superRefine((value, context) => {
  if (value.sortBy === "distance" && !value.origin) {
    context.addIssue({
      code: "custom",
      path: ["origin"],
      message: "An origin is required when sorting by distance",
    });
  }
});

export const locationSuggestionQuerySchema = z.object({
  q: z.string().trim().min(3).max(120),
  sessionToken: z.string().uuid(),
  language: z.enum(["de", "en", "fa"]).default("de"),
  proximityLatitude: z.coerce.number().min(-90).max(90).optional(),
  proximityLongitude: z.coerce.number().min(-180).max(180).optional(),
}).superRefine((value, context) => {
  if ((value.proximityLatitude === undefined) !== (value.proximityLongitude === undefined)) {
    context.addIssue({
      code: "custom",
      path: ["proximityLatitude"],
      message: "Both proximity coordinates are required",
    });
  }
});

export const locationRetrieveQuerySchema = z.object({
  mapboxId: z.string().min(1).max(300),
  sessionToken: z.string().uuid(),
  language: z.enum(["de", "en", "fa"]).default("de"),
});

export const reverseGeocodeBodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  language: z.enum(["de", "en", "fa"]).default("de"),
});

export const mapBoundsSchema = z.object({
  west: z.number().min(-180).max(180),
  south: z.number().min(-90).max(90),
  east: z.number().min(-180).max(180),
  north: z.number().min(-90).max(90),
}).refine((bounds) => bounds.west < bounds.east && bounds.south < bounds.north, {
  message: "Invalid map bounds",
});

export const businessMapBodySchema = z.object({
  categoryId: z.number().int().positive().optional(),
  subCategoryId: z.number().int().positive().optional(),
  cityId: z.number().int().positive().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  origin: locationOriginSchema.optional(),
  bounds: mapBoundsSchema.optional(),
});

export type BusinessSearchBody = z.infer<typeof businessSearchBodySchema>;
export type LocationOrigin = z.infer<typeof locationOriginSchema>;
export type LocationSource = z.infer<typeof locationSourceSchema>;
export type BusinessMapBody = z.infer<typeof businessMapBodySchema>;
