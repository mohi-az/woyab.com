import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../lib/prisma.js";
import { getPlacePhotos, getPhotoBuffer } from "./google-places.service.js";

export const googlePlacesRouter = Router();

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
googlePlacesRouter.get("/businesses/:id/google-photos", async (req: Request, res: Response) => {
  const { id } = businessIdSchema.parse(req.params);

  const business = await prisma.business.findUnique({
    where: { id },
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
 * /google-photos/{photoReference}:
 *   get:
 *     summary: Proxy and cache a Google Places photo
 *     tags: [Google Places]
 *     parameters:
 *       - in: path
 *         name: photoReference
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: maxWidth
 *         schema: { type: integer, default: 800 }
 *     responses:
 *       200:
 *         description: Photo binary
 *       404:
 *         description: Photo not found
 */
googlePlacesRouter.get("/google-photos/*", async (req: Request, res: Response) => {
  // The photoReference is the full path after /google-photos/
  // e.g. "places/ChIJ.../photos/AUacShh..."
  const photoReference = (req.params as Record<string, string>)[0];
  if (!photoReference) {
    res.status(400).json({ success: false, error: "Photo reference is required" });
    return;
  }

  const { maxWidth } = photoQuerySchema.parse(req.query);
  const result = await getPhotoBuffer(photoReference, maxWidth);

  if (!result) {
    res.status(404).json({ success: false, error: "Photo not found" });
    return;
  }

  // Set aggressive caching headers (7 days)
  res.set({
    "Content-Type": result.contentType,
    "Cache-Control": "public, max-age=604800, immutable",
    "Content-Length": String(result.buffer.length),
  });
  res.send(result.buffer);
});
