import fs from "node:fs";
import path from "node:path";
import { env } from "../../config/env.js";
import { logger } from "../../logger/logger.js";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_PHOTOS = 10;
const CACHE_DIR = path.join(process.cwd(), ".cache", "google-photos");

// ── In-memory metadata cache ────────────────────────────────────────────────
type CachedPhotoMeta = {
  photos: GooglePhotoItem[];
  fetchedAt: number;
};

export type GooglePhotoItem = {
  photoReference: string;
  width: number;
  height: number;
  htmlAttributions: string[];
};

const metadataCache = new Map<string, CachedPhotoMeta>();

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function photoCachePath(photoReference: string) {
  // Use a safe filename derived from the photo reference
  const safeName = photoReference.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200);
  return path.join(CACHE_DIR, `${safeName}.jpg`);
}

function metaCachePath(placeId: string) {
  const safeName = placeId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(CACHE_DIR, `${safeName}.meta.json`);
}

// ── Fetch photo metadata for a place ────────────────────────────────────────
export async function getPlacePhotos(placeId: string): Promise<GooglePhotoItem[]> {
  if (!env.GOOGLE_PLACES_API_KEY) {
    return [];
  }

  // Check in-memory cache
  const cached = metadataCache.get(placeId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.photos;
  }

  // Check disk cache
  ensureCacheDir();
  const diskPath = metaCachePath(placeId);
  try {
    if (fs.existsSync(diskPath)) {
      const raw = JSON.parse(fs.readFileSync(diskPath, "utf-8")) as CachedPhotoMeta;
      if (Date.now() - raw.fetchedAt < CACHE_TTL_MS) {
        metadataCache.set(placeId, raw);
        return raw.photos;
      }
    }
  } catch {
    // Ignore corrupted cache
  }

  // Fetch from Google Places API (New)
  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=photos`;
    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "photos",
      },
    });

    if (!response.ok) {
      logger.warn({ status: response.status, placeId }, "Google Places API error");
      return [];
    }

    const data = (await response.json()) as {
      photos?: Array<{
        name: string;
        widthPx: number;
        heightPx: number;
        authorAttributions?: Array<{ displayName?: string; uri?: string }>;
      }>;
    };

    const photos: GooglePhotoItem[] = (data.photos ?? []).slice(0, MAX_PHOTOS).map((photo) => ({
      photoReference: photo.name,
      width: photo.widthPx,
      height: photo.heightPx,
      htmlAttributions: (photo.authorAttributions ?? [])
        .map((attr) => attr.displayName ?? "")
        .filter(Boolean),
    }));

    const entry: CachedPhotoMeta = { photos, fetchedAt: Date.now() };
    metadataCache.set(placeId, entry);

    // Persist to disk
    try {
      fs.writeFileSync(diskPath, JSON.stringify(entry), "utf-8");
    } catch (err) {
      logger.warn({ err, placeId }, "Failed to write metadata cache");
    }

    return photos;
  } catch (err) {
    logger.error({ err, placeId }, "Failed to fetch Google Places photos");
    return [];
  }
}

// ── Fetch and cache a single photo binary ───────────────────────────────────
export async function getPhotoBuffer(
  photoReference: string,
  maxWidth = 800,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!env.GOOGLE_PLACES_API_KEY) {
    return null;
  }

  ensureCacheDir();
  const cachePath = photoCachePath(photoReference);

  // Check disk cache
  try {
    if (fs.existsSync(cachePath)) {
      const stats = fs.statSync(cachePath);
      if (Date.now() - stats.mtimeMs < CACHE_TTL_MS) {
        return { buffer: fs.readFileSync(cachePath), contentType: "image/jpeg" };
      }
      // Cache expired, delete it
      fs.unlinkSync(cachePath);
    }
  } catch {
    // Ignore
  }

  // Fetch from Google Places Photo API (New)
  try {
    const url = `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=${maxWidth}`;
    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
      },
    });

    if (!response.ok) {
      logger.warn({ status: response.status, photoReference }, "Google Places Photo API error");
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") ?? "image/jpeg";

    // Persist to disk cache
    try {
      fs.writeFileSync(cachePath, buffer);
    } catch (err) {
      logger.warn({ err, photoReference }, "Failed to write photo cache");
    }

    return { buffer, contentType };
  } catch (err) {
    logger.error({ err, photoReference }, "Failed to fetch Google Places photo");
    return null;
  }
}
