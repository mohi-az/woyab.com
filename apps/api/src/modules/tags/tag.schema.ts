import { z } from "zod";

import { paginationQuerySchema } from "@woyab/shared";

export const createTagBodySchema = z.object({
  nameFa: z.string().min(1),
  nameEn: z.string().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
});

export const updateTagBodySchema = createTagBodySchema.partial();

export const tagIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listTagsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
});

export type CreateTagBody = z.infer<typeof createTagBodySchema>;
export type UpdateTagBody = z.infer<typeof updateTagBodySchema>;
export type ListTagsQuery = z.infer<typeof listTagsQuerySchema>;
