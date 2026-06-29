import type { Request, Response } from "express";

import {
  businessIdParamsSchema,
  createBusinessBodySchema,
  listBusinessesQuerySchema,
  updateBusinessBodySchema,
} from "./business.schema.js";
import { businessService } from "./business.service.js";

export const businessController = {
  list: async (req: Request, res: Response) => {
    const query = listBusinessesQuerySchema.parse(req.query);
    const result = await businessService.list(query);
    res.json({ success: true, data: result });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = businessIdParamsSchema.parse(req.params);
    const business = await businessService.getById(id);
    res.json({ success: true, data: business });
  },

  create: async (req: Request, res: Response) => {
    const body = createBusinessBodySchema.parse(req.body);
    const business = await businessService.create(body);
    res.status(201).json({ success: true, data: business });
  },

  update: async (req: Request, res: Response) => {
    const { id } = businessIdParamsSchema.parse(req.params);
    const body = updateBusinessBodySchema.parse(req.body);
    const business = await businessService.update(id, body);
    res.json({ success: true, data: business });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = businessIdParamsSchema.parse(req.params);
    await businessService.delete(id);
    res.status(204).send();
  },
};
