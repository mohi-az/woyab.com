import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../lib/prisma.js";
import { rateLimit } from "../../middlewares/rate-limit.middleware.js";
import { getPlacePhotos, getPhotoBuffer } from "./google-places.service.js";

export const googlePlacesRouter = Router();
const googlePlacesRateLimit = rateLimit({
  keyPrefix: "public-google",
  limit: 90,
  windowMs: 60_000,
});

const businessIdSchema = z.object({
  id: z.string().min(1),
});

const photoReferenceSchema = z.object({
  photoReference: z.string().min(1),
});

const photoQuerySchema = z.object({
  maxWidth: z.coerce.number().int().min(100).max(4800).default(800),
});

/**
 * @openapi
 * /businesses/{id}/google-photos:
 *   get:
 *     summary: Get Google Places photos for a business
 *     tags: [Businesses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of Google Places photo references
 */
googlePlacesRouter.get("/businesses/:id/google-photos", googlePlacesRateLimit, async (req: Request, res: Response) => {
  const { id } = businessIdSchema.parse(req.params);

  const business = await prisma.business.findFirst({
    where: { id, removedAt: null, status: "ACTIVE", verified: true },
    select: { googlePlaceId: true },
  });

  if (!business?.googlePlaceId) {
    res.json({ success: true, data: { photos: [] } });
    return;
  }

  const photos = await getPlacePhotos(business.googlePlaceId);
  res.json({ success: true, data: { photos } });
});

/**
 * @openapi
 * /businesses/{id}/google-photos/{photoReference}:
 *   get:
 *     summary: Get a Google Places photo for a business
 *     tags: [Businesses]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: path, name: photoReference, required: true, schema: { type: string } }
 *       - { in: query, name: maxWidth, schema: { type: integer, minimum: 100, maximum: 4800, default: 800 } }
 *     responses:
 *       200: { description: Image binary }
 *       404: { description: Business or photo not found }
 */
googlePlacesRouter.get("/businesses/:id/google-photos/*photoReference", googlePlacesRateLimit, async (req: Request, res: Response) => {
  const { id } = businessIdSchema.parse(req.params);
  const photoReferenceSegments = (req.params as Record<string, string | string[]>).photoReference;
  const { photoReference } = photoReferenceSchema.parse({ photoReference: Array.isArray(photoReferenceSegments) ? photoReferenceSegments.join("/") : photoReferenceSegments });
  const { maxWidth } = photoQuerySchema.parse(req.query);
  const business = await prisma.business.findFirst({
    where: { id, removedAt: null, status: "ACTIVE", verified: true },
    select: { googlePlaceId: true },
  });
  if (!business?.googlePlaceId) {
    res.status(404).json({ success: false, error: "Business photo not found" });
    return;
  }
  const allowedPhotos = await getPlacePhotos(business.googlePlaceId);
  if (!allowedPhotos.some((photo) => photo.photoReference === photoReference)) {
    res.status(404).json({ success: false, error: "Business photo not found" });
    return;
  }
  const result = await getPhotoBuffer(photoReference, maxWidth);
  if (!result) {
    res.status(404).json({ success: false, error: "Business photo not found" });
    return;
  }
  res.set({ "Content-Type": result.contentType, "Cache-Control": "private, no-store", "Content-Length": String(result.buffer.length) });
  res.send(result.buffer);
});

/**
 * @openapi
 * /businesses/{id}/google-photo-thumbnail:
 *   get:
 *     summary: Get the first Google Places photo as a thumbnail
 *     tags: [Businesses]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: query, name: maxWidth, schema: { type: integer, minimum: 100, maximum: 4800, default: 800 } }
 *     responses:
 *       200: { description: Image binary }
 *       404: { description: Business or photo not found }
 */
googlePlacesRouter.get("/businesses/:id/google-photo-thumbnail", googlePlacesRateLimit, async (req: Request, res: Response) => {
  const { id } = businessIdSchema.parse(req.params);
  const { maxWidth } = photoQuerySchema.parse(req.query);

  const business = await prisma.business.findFirst({
    where: { id, removedAt: null, status: "ACTIVE", verified: true },
    select: { googlePlaceId: true },
  });

  if (!business?.googlePlaceId) {
    res.status(404).json({ success: false, error: "Google Place ID not found" });
    return;
  }

  const [photo] = await getPlacePhotos(business.googlePlaceId);
  if (!photo) {
    res.status(404).json({ success: false, error: "Google photo not found" });
    return;
  }

  const result = await getPhotoBuffer(photo.photoReference, maxWidth);
  if (!result) {
    res.status(404).json({ success: false, error: "Google photo not found" });
    return;
  }

  res.set({
    "Content-Type": result.contentType,
    "Cache-Control": "private, no-store",
    "Content-Length": String(result.buffer.length),
  });
  res.send(result.buffer);
});
