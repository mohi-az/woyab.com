import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../lib/prisma.js";
import { validateRequest } from "../../validation/validate-request.js";
import { requireInternalApi } from "../../middlewares/internal-api.middleware.js";
import { rateLimit } from "../../middlewares/rate-limit.middleware.js";
import { getPlaceImportPreview, getPlacePhotoBuffer, getPlacePhotos } from "../businesses/google-places.service.js";
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

/**
 * @openapi
 * /geo/map-config:
 *   get:
 *     summary: Get public map configuration
 *     tags: [Geo]
 *     responses:
 *       200: { description: Map configuration }
 */
geoRouter.get("/map-config", geoController.mapConfig);
/**
 * @openapi
 * /geo/suggestions:
 *   post:
 *     summary: Get location suggestions
 *     tags: [Geo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [q, language]
 *             properties:
 *               q: { type: string, minLength: 3, maxLength: 120, example: Berlin }
 *               language: { type: string, enum: [de, en, fa], example: en }
 *               proximityLatitude: { type: number, example: 52.52 }
 *               proximityLongitude: { type: number, example: 13.405 }
 *     responses:
 *       200: { description: Location suggestions }
 *       422: { description: Invalid suggestion request }
 */
geoRouter.post("/suggestions", geocodingRateLimit, validateRequest({ body: locationSuggestionQuerySchema }), geoController.suggest);
/**
 * @openapi
 * /geo/reverse:
 *   post:
 *     summary: Reverse-geocode coordinates
 *     tags: [Geo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude, language]
 *             properties:
 *               latitude: { type: number, minimum: -90, maximum: 90, example: 52.52 }
 *               longitude: { type: number, minimum: -180, maximum: 180, example: 13.405 }
 *               language: { type: string, enum: [de, en, fa], example: en }
 *     responses:
 *       200: { description: Reverse-geocoded address }
 *       422: { description: Invalid coordinate request }
 */
geoRouter.post("/reverse", geocodingRateLimit, validateRequest({ body: reverseGeocodeBodySchema }), geoController.reverse);

/** Admin import preview. No Google-provided content is persisted by this endpoint. */
/**
 * @openapi
 * /geo/place-details/{placeId}:
 *   get:
 *     summary: Preview Google Place Details for an admin business import
 *     tags: [Geo]
 *     security: [{ internalApi: [] }]
 *     parameters:
 *       - { in: path, name: placeId, required: true, schema: { type: string }, example: ChIJHfBW2uNQqEcR_w2WKum4eJo }
 *       - { in: query, name: language, schema: { type: string, enum: [de, en, fa], default: de } }
 *     responses:
 *       200: { description: Google Place import preview }
 *       400: { description: Invalid place ID or Google rejected the request }
 *       401: { description: Missing or invalid internal API secret }
 *       404: { description: Google place not found }
 *       429: { description: Rate limited }
 *       503: { description: Google Places is unavailable or not configured }
 */
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
/**
 * @openapi
 * /geo/place-photos/{placeId}:
 *   get:
 *     summary: List Google Place photo references for an authenticated internal caller
 *     tags: [Geo]
 *     security: [{ internalApi: [] }]
 *     parameters:
 *       - { in: path, name: placeId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Google Place photo references }
 *       401: { description: Missing or invalid internal API secret }
 *       429: { description: Rate limited }
 */
geoRouter.get("/place-photos/:placeId", requireInternalApi, internalGoogleRateLimit, async (req: Request, res: Response) => {
  const placeId = placeIdSchema.parse(req.params.placeId);
  const photos = await getPlacePhotos(placeId);
  res.set("Cache-Control", "private, no-store");
  res.json({ success: true, data: { photos } });
});

/** Serve a single Google place photo binary (for wizard preview) */
/**
 * @openapi
 * /geo/place-photo:
 *   get:
 *     summary: Get a Google Place photo binary for an authenticated internal caller
 *     tags: [Geo]
 *     security: [{ internalApi: [] }]
 *     parameters:
 *       - { in: query, name: placeId, required: true, schema: { type: string } }
 *       - { in: query, name: ref, required: true, schema: { type: string } }
 *       - { in: query, name: maxWidth, schema: { type: integer, minimum: 100, maximum: 4800, default: 800 } }
 *     responses:
 *       200:
 *         description: Image binary
 *         content:
 *           image/jpeg: { schema: { type: string, format: binary } }
 *       401: { description: Missing or invalid internal API secret }
 *       404: { description: Photo not found }
 *       429: { description: Rate limited }
 */
geoRouter.get("/place-photo", requireInternalApi, internalGoogleRateLimit, async (req: Request, res: Response) => {
  const ref = String(req.query.ref ?? "").trim();
  const placeId = String(req.query.placeId ?? "").trim();
  const maxWidth = Math.min(4800, Math.max(100, Number(req.query.maxWidth) || 800));
  if (!ref || !placeId) { res.status(400).json({ success: false, error: "ref and placeId required" }); return; }
  const result = await getPlacePhotoBuffer(placeId, ref, maxWidth);
  if (!result) { res.status(404).json({ success: false, error: "Not found" }); return; }
  res.set({ "Content-Type": result.contentType, "Cache-Control": "private, no-store", "Content-Length": String(result.buffer.length) });
  res.send(result.buffer);
});
