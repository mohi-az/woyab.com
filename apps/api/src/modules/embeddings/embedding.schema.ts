import { z } from "zod";

export const semanticSearchSchema = z.object({
  query: z.string().trim().min(1, "Search query cannot be empty").max(500),
  locale: z.enum(["de", "en", "fa"]).default("fa"),
  categoryId: z.coerce.number().int().positive().optional(),
  subCategoryId: z.coerce.number().int().positive().optional(),
  cityId: z.coerce.number().int().positive().optional(),
  tagIds: z
    .union([
      z.array(z.coerce.number().int().positive()),
      z.string().transform((str) =>
        str
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n) && n > 0),
      ),
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  minSimilarity: z.coerce.number().min(0).max(1).default(0.6),
});

export type SemanticSearchInput = z.infer<typeof semanticSearchSchema>;

export const reindexSingleSchema = z.object({
  id: z.string().min(1, "Business ID is required"),
});

export const testSearchSchema = z.object({
  query: z.string().trim().min(1, "Query is required").max(500),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  minSimilarity: z.coerce.number().min(0).max(1).default(0.2),
});

export type TestSearchInput = z.infer<typeof testSearchSchema>;
