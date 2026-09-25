import type { Request, Response } from "express";
import {
  reindexSingleSchema,
  semanticSearchSchema,
  testSearchSchema,
} from "./embedding.schema.js";
import { embeddingService } from "./embedding.service.js";

export const embeddingController = {
  search: async (req: Request, res: Response) => {
    const body = semanticSearchSchema.parse(req.body);
    const result = await embeddingService.search(body);
    res.json({ success: true, data: result });
  },

  getStats: async (_req: Request, res: Response) => {
    const stats = await embeddingService.getStats();
    res.json({ success: true, data: stats });
  },

  reindexSingle: async (req: Request, res: Response) => {
    const { id } = reindexSingleSchema.parse(req.params);
    const result = await embeddingService.reindexSingle(id);
    res.json({ success: true, data: result });
  },

  testSearch: async (req: Request, res: Response) => {
    const body = testSearchSchema.parse(req.body);
    const result = await embeddingService.testSearch(body);
    res.json({ success: true, data: result });
  },
};
