import { Router } from "express";
import type { Request, Response } from "express";

import { validateRequest } from "../../validation/validate-request.js";
import { requireInternalApi } from "../../middlewares/internal-api.middleware.js";
import { rateLimit } from "../../middlewares/rate-limit.middleware.js";
import { getPhotoBuffer, getPlacePhotos } from "../businesses/google-places.service.js";
import { geoController } from "./geo.controller.js";
import {
  locationSuggestionQuerySchema,
  reverseGeocodeBodySchema,
} from "./geo.schema.js";

export const geoRouter = Router();

const geocodingRateLimit = rateLimit({
  keyPrefix: "geocoding",
  limit: 60,
  windowMs: 60_000,
});
const internalGoogleRateLimit = rateLimit({
  keyPrefix: "internal-google",
  limit: 60,
  windowMs: 60_000,
});

geoRouter.get("/map-config", geoController.mapConfig);
geoRouter.post("/suggestions", geocodingRateLimit, validateRequest({ body: locationSuggestionQuerySchema }), geoController.suggest);
geoRouter.post("/reverse", geocodingRateLimit, validateRequest({ body: reverseGeocodeBodySchema }), geoController.reverse);

/** Direct place-photos lookup by Google Place ID (for wizard – no businessId needed) */
geoRouter.get("/place-photos/:placeId", requireInternalApi, internalGoogleRateLimit, async (req: Request, res: Response) => {
  const placeId = String(req.params.placeId ?? "").trim();
  if (!placeId) { res.status(400).json({ success: false, error: "placeId required" }); return; }
  const photos = await getPlacePhotos(placeId);
  res.json({ success: true, data: { photos } });
});

/** Serve a single Google place photo binary (for wizard preview) */
geoRouter.get("/place-photo", requireInternalApi, internalGoogleRateLimit, async (req: Request, res: Response) => {
  const ref = String(req.query.ref ?? "").trim();
  const placeId = String(req.query.placeId ?? "").trim();
  const maxWidth = Math.min(4800, Math.max(100, Number(req.query.maxWidth) || 800));
  if (!ref || !placeId) { res.status(400).json({ success: false, error: "ref and placeId required" }); return; }
  const allowedPhotos = await getPlacePhotos(placeId);
  if (!allowedPhotos.some((photo) => photo.photoReference === ref)) {
    res.status(404).json({ success: false, error: "Photo not found for this place" });
    return;
  }
  const result = await getPhotoBuffer(ref, maxWidth);
  if (!result) { res.status(404).json({ success: false, error: "Not found" }); return; }
  res.set({ "Content-Type": result.contentType, "Cache-Control": "public, max-age=604800, immutable", "Content-Length": String(result.buffer.length) });
  res.send(result.buffer);
});
