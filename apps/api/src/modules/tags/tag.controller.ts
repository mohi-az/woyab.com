import type { Request, Response } from "express";

import { createTagBodySchema, listTagsQuerySchema, tagIdParamsSchema, updateTagBodySchema } from "./tag.schema.js";
import { tagService } from "./tag.service.js";

export const tagController = {
  list: async (req: Request, res: Response) => {
    const query = listTagsQuerySchema.parse(req.query);
    const result = await tagService.list(query);
    res.json({ success: true, data: result });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = tagIdParamsSchema.parse(req.params);
    const tag = await tagService.getById(id);
    res.json({ success: true, data: tag });
  },

  create: async (req: Request, res: Response) => {
    const body = createTagBodySchema.parse(req.body);
    const tag = await tagService.create(body);
    res.status(201).json({ success: true, data: tag });
  },

  update: async (req: Request, res: Response) => {
    const { id } = tagIdParamsSchema.parse(req.params);
    const body = updateTagBodySchema.parse(req.body);
    const tag = await tagService.update(id, body);
    res.json({ success: true, data: tag });
  },

  delete: async (req: Request, res: Response) => {
    const { id } = tagIdParamsSchema.parse(req.params);
    await tagService.delete(id);
    res.status(204).send();
  },
};
