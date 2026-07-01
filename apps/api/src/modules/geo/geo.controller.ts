import type { Request, Response } from "express";

import {
  locationSuggestionQuerySchema,
  reverseGeocodeBodySchema,
} from "./geo.schema.js";
import { geoService } from "./geo.service.js";

export const geoController = {
  mapConfig: async (_req: Request, res: Response) => {
    res.json({ success: true, data: geoService.mapConfig() });
  },

  suggest: async (req: Request, res: Response) => {
    const query = locationSuggestionQuerySchema.parse(req.body);
    res.json({ success: true, data: await geoService.suggest(query) });
  },

  reverse: async (req: Request, res: Response) => {
    const body = reverseGeocodeBodySchema.parse(req.body);
    res.json({ success: true, data: await geoService.reverse(body) });
  },
};
