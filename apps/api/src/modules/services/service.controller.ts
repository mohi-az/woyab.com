import type { Request, Response } from "express";

import {
  createServiceBodySchema,
  listServicesQuerySchema,
  serviceBusinessParamsSchema,
  serviceParamsSchema,
  updateServiceBodySchema,
} from "./service.schema.js";
import { serviceService } from "./service.service.js";

export const serviceController = {
  list: async (req: Request, res: Response) => {
    const { businessId } = serviceBusinessParamsSchema.parse(req.params);
    const query = listServicesQuerySchema.parse(req.query);
    const result = await serviceService.list(businessId, query);
    res.json({ success: true, data: result });
  },

  getById: async (req: Request, res: Response) => {
    const { businessId, id } = serviceParamsSchema.parse(req.params);
    const service = await serviceService.getById(id, businessId);
    res.json({ success: true, data: service });
  },

  create: async (req: Request, res: Response) => {
    const { businessId } = serviceBusinessParamsSchema.parse(req.params);
    const body = createServiceBodySchema.parse(req.body);
    const service = await serviceService.create(businessId, body);
    res.status(201).json({ success: true, data: service });
  },

  update: async (req: Request, res: Response) => {
    const { businessId, id } = serviceParamsSchema.parse(req.params);
    const body = updateServiceBodySchema.parse(req.body);
    const service = await serviceService.update(id, businessId, body);
    res.json({ success: true, data: service });
  },

  delete: async (req: Request, res: Response) => {
    const { businessId, id } = serviceParamsSchema.parse(req.params);
    await serviceService.delete(id, businessId);
    res.status(204).send();
  },
};
