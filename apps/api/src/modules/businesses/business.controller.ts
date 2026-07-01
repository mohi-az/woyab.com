import type { Request, Response } from "express";

import {
  businessIdParamsSchema,
  businessLocaleQuerySchema,
  businessSlugParamsSchema,
  businessMapBodySchema,
  businessSearchBodySchema,
  createBusinessBodySchema,
  listBusinessesQuerySchema,
  updateBusinessBodySchema,
} from "./business.schema.js";
import { businessService } from "./business.service.js";

export const businessController = {
  map: async (req: Request, res: Response) => {
    const body = businessMapBodySchema.parse(req.body);
    res.json({ success: true, data: await businessService.map(body) });
  },

  search: async (req: Request, res: Response) => {
    const body = businessSearchBodySchema.parse(req.body);
    const result = await businessService.search(body);
    res.json({ success: true, data: result });
  },

  list: async (req: Request, res: Response) => {
    const query = listBusinessesQuerySchema.parse(req.query);
    const result = await businessService.list(query);
    res.json({ success: true, data: result });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = businessIdParamsSchema.parse(req.params);
    const { locale } = businessLocaleQuerySchema.parse(req.query);
    const business = await businessService.getById(id, locale);
    res.json({ success: true, data: business });
  },

  getBySlug: async (req: Request, res: Response) => {
    const { slug } = businessSlugParamsSchema.parse(req.params);
    const { locale } = businessLocaleQuerySchema.parse(req.query);
    const business = await businessService.getBySlug(slug, locale);
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
