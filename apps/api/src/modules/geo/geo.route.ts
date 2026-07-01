import { Router } from "express";

import { validateRequest } from "../../validation/validate-request.js";
import { geoController } from "./geo.controller.js";
import {
  locationSuggestionQuerySchema,
  reverseGeocodeBodySchema,
} from "./geo.schema.js";

export const geoRouter = Router();

geoRouter.get("/map-config", geoController.mapConfig);
geoRouter.post("/suggestions", validateRequest({ body: locationSuggestionQuerySchema }), geoController.suggest);
geoRouter.post("/reverse", validateRequest({ body: reverseGeocodeBodySchema }), geoController.reverse);
