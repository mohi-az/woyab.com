import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../lib/prisma.js";
import { validateRequest } from "../../validation/validate-request.js";
import { requireInternalApi } from "../../middlewares/internal-api.middleware.js";
import { rateLimit } from "../../middlewares/rate-limit.middleware.js";
import { getPhotoBuffer, getPlaceImportPreview, getPlacePhotos } from "../businesses/google-places.service.js";
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

const placeIdSchema = z.string().trim().min(8).max(255).regex(/^[A-Za-z0-9_-]+$/);
const placeLanguageSchema = z.enum(["de", "en", "fa"]).default("de");

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

async function matchCatalogLocation(input: {
  city: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  const exactCity = input.city
    ? await prisma.city.findFirst({
        where: {
          OR: [
            { nameEn: { equals: input.city, mode: "insensitive" } },
            { nameFa: { equals: input.city, mode: "insensitive" } },
          ],
        },
        select: { id: true, nameEn: true, nameFa: true, latitude: true, longitude: true },
      })
    : null;

  let city = exactCity;
  if (!city && input.latitude !== null && input.longitude !== null) {
    const candidates = await prisma.city.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: { id: true, nameEn: true, nameFa: true, latitude: true, longitude: true },
    });
    const nearest = candidates
      .flatMap((candidate) => candidate.latitude === null || candidate.longitude === null ? [] : [{
        candidate,
        distance: distanceKm(
          { latitude: input.latitude as number, longitude: input.longitude as number },
          { latitude: candidate.latitude, longitude: candidate.longitude },
        ),
      }])
      .sort((left, right) => left.distance - right.distance)[0];
    if (nearest && nearest.distance <= 50) city = nearest.candidate;
  }

  const district = city && input.district
    ? await prisma.district.findFirst({
        where: {
          cityId: city.id,
          OR: [
            { nameEn: { equals: input.district, mode: "insensitive" } },
            { nameFa: { equals: input.district, mode: "insensitive" } },
          ],
        },
        select: { id: true, nameEn: true, nameFa: true },
      })
    : null;

  return {
    city: city ? { id: city.id, nameEn: city.nameEn, nameFa: city.nameFa } : null,
    district,
  };
}

geoRouter.get("/map-config", geoController.mapConfig);
geoRouter.post("/suggestions", geocodingRateLimit, validateRequest({ body: locationSuggestionQuerySchema }), geoController.suggest);
geoRouter.post("/reverse", geocodingRateLimit, validateRequest({ body: reverseGeocodeBodySchema }), geoController.reverse);

/** Admin import preview. No Google-provided content is persisted by this endpoint. */
geoRouter.get("/place-details/:placeId", requireInternalApi, internalGoogleRateLimit, async (req: Request, res: Response) => {
  const placeId = placeIdSchema.parse(req.params.placeId);
  const language = placeLanguageSchema.parse(req.query.language ?? "de");
  const place = await getPlaceImportPreview(placeId, language);
  const [catalogMatch, duplicate] = await Promise.all([
    matchCatalogLocation(place),
    prisma.business.findFirst({
      where: { googlePlaceId: place.placeId, removedAt: null },
      select: { id: true, slug: true, businessName: true, status: true },
    }),
  ]);

  res.set("Cache-Control", "private, no-store");
  res.json({ success: true, data: { ...place, catalogMatch, duplicate } });
});

/** Direct place-photos lookup by Google Place ID (for wizard – no businessId needed) */
geoRouter.get("/place-photos/:placeId", requireInternalApi, internalGoogleRateLimit, async (req: Request, res: Response) => {
  const placeId = placeIdSchema.parse(req.params.placeId);
  const photos = await getPlacePhotos(placeId);
  res.set("Cache-Control", "private, no-store");
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
  res.set({ "Content-Type": result.contentType, "Cache-Control": "private, no-store", "Content-Length": String(result.buffer.length) });
  res.send(result.buffer);
});
