import { z } from "zod";

import { paginationQuerySchema } from "@woyab/shared";

export const createServiceBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  currency: z.string().length(3).default("EUR"),
  duration: z.number().int().positive().optional(),
  unit: z.string().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateServiceBodySchema = createServiceBodySchema.partial();

export const serviceParamsSchema = z.object({
  businessId: z.string().min(1),
  id: z.string().min(1),
});

export const serviceBusinessParamsSchema = z.object({
  businessId: z.string().min(1),
});

export const listServicesQuerySchema = paginationQuerySchema.extend({
  active: z.enum(["true", "false"]).optional(),
});

export type CreateServiceBody = z.infer<typeof createServiceBodySchema>;
export type UpdateServiceBody = z.infer<typeof updateServiceBodySchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
