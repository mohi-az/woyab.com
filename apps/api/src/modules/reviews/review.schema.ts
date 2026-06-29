import { z } from "zod";

import { paginationQuerySchema } from "@fargo/shared";

export const createReviewBodySchema = z.object({
  userId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: z.string().max(2000).optional(),
  visitDate: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
});

export const updateReviewBodySchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  comment: z.string().max(2000).optional(),
  visitDate: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  verified: z.boolean().optional(),
});

export const reviewParamsSchema = z.object({
  businessId: z.string().min(1),
  id: z.string().min(1),
});

export const reviewIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const reviewBusinessParamsSchema = z.object({
  businessId: z.string().min(1),
});

export const listReviewsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;
export type UpdateReviewBody = z.infer<typeof updateReviewBodySchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
