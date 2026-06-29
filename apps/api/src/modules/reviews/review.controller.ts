import type { Request, Response } from "express";

import {
  createReviewBodySchema,
  listReviewsQuerySchema,
  reviewBusinessParamsSchema,
  reviewIdParamsSchema,
  reviewParamsSchema,
  updateReviewBodySchema,
} from "./review.schema.js";
import { reviewService } from "./review.service.js";

export const reviewController = {
  list: async (req: Request, res: Response) => {
    const { businessId } = reviewBusinessParamsSchema.parse(req.params);
    const query = listReviewsQuerySchema.parse(req.query);
    const result = await reviewService.list(businessId, query);
    res.json({ success: true, data: result });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = reviewIdParamsSchema.parse(req.params);
    const review = await reviewService.getById(id);
    res.json({ success: true, data: review });
  },

  create: async (req: Request, res: Response) => {
    const { businessId } = reviewBusinessParamsSchema.parse(req.params);
    const body = createReviewBodySchema.parse(req.body);
    const review = await reviewService.create(businessId, body);
    res.status(201).json({ success: true, data: review });
  },

  update: async (req: Request, res: Response) => {
    const { id } = reviewIdParamsSchema.parse(req.params);
    const body = updateReviewBodySchema.parse(req.body);
    const review = await reviewService.update(id, body);
    res.json({ success: true, data: review });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = reviewIdParamsSchema.parse(req.params);
    await reviewService.delete(id);
    res.status(204).send();
  },
};
