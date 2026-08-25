import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const API_BASE = process.env.API_URL ?? "http://localhost:4000";
const GOOGLE_COVER_WIDTH = 1_600;
const MAX_STORED_IMAGE_BYTES = 20 * 1024 * 1024;
const BUSINESS_IMAGE_DIR = process.env.BUSINESS_IMAGE_STORAGE_DIR?.trim()
  ? path.resolve(process.env.BUSINESS_IMAGE_STORAGE_DIR)
  : path.join(process.cwd(), "public", "uploads", "businesses");
const BUSINESS_IMAGE_URL_PREFIX = "/media/businesses/";
const GOOGLE_COVER_FILENAME_PREFIX = "google-place-";

type GooglePhotoListResponse = {
  success?: boolean;
  data?: {
    photos?: Array<{ photoReference?: string }>;
  };
};

function internalHeaders() {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new Error("Google Places image storage is not configured.");
  return { "x-woyab-internal-secret": secret };
}

function imageExtension(contentType: string) {
  const normalized = contentType.split(";", 1)[0]?.trim().toLowerCase();
  if (normalized === "image/jpeg") return "jpg";
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  return null;
}

export function businessImageStoragePath(filename: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/.test(filename)) return null;
  return path.join(BUSINESS_IMAGE_DIR, filename);
}

export function businessImageContentType(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return null;
}

async function hasStoredFile(filePath: string) {
  try {
    return (await stat(filePath)).size > 0;
  } catch {
    return false;
  }
}

async function writeStoredImage(filename: string, buffer: Buffer) {
  const targetPath = businessImageStoragePath(filename);
  if (!targetPath) throw new Error("Invalid stored business image filename.");
  if (await hasStoredFile(targetPath)) return;

  const temporaryPath = `${targetPath}.${process.pid}-${randomUUID()}.tmp`;
  try {
    await mkdir(BUSINESS_IMAGE_DIR, { recursive: true });
    await writeFile(temporaryPath, buffer);
    try {
      await rename(temporaryPath, targetPath);
    } catch (error) {
      // Another frontend instance may have stored the same content-addressed
      // Google cover while this request was in flight.
      if (!(await hasStoredFile(targetPath))) throw error;
    }
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

export async function storeBusinessImage(input: {
  buffer: Buffer;
  contentType: string;
  basename?: string;
  maxBytes?: number;
}) {
  const extension = imageExtension(input.contentType);
  if (!extension) throw new Error("Unsupported business image format.");
  if (!input.buffer.length || input.buffer.length > (input.maxBytes ?? MAX_STORED_IMAGE_BYTES)) {
    throw new Error("Invalid business image size.");
  }

  const basename = input.basename ?? randomUUID();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,180}$/.test(basename)) {
    throw new Error("Invalid business image name.");
  }
  const filename = `${basename}.${extension}`;
  await writeStoredImage(filename, input.buffer);
  return `${BUSINESS_IMAGE_URL_PREFIX}${filename}`;
}

export function isGoogleProxyImageUrl(imageUrl: string | null | undefined) {
  return Boolean(imageUrl && (
    imageUrl.startsWith("/api/place-photo?")
    || /\/api\/businesses\/[^/]+\/google-photo(?:s|-thumbnail)/.test(imageUrl)
  ));
}

export function isStoredGoogleCoverUrl(imageUrl: string | null | undefined) {
  return Boolean(imageUrl && (
    imageUrl.startsWith(`${BUSINESS_IMAGE_URL_PREFIX}${GOOGLE_COVER_FILENAME_PREFIX}`)
    || imageUrl.startsWith(`/uploads/businesses/${GOOGLE_COVER_FILENAME_PREFIX}`)
  ));
}

export async function persistFirstGooglePlacePhoto(placeId: string, preferredPhotoReference?: string | null) {
  const normalizedPlaceId = placeId.trim();
  if (!normalizedPlaceId) return null;

  const headers = internalHeaders();
  let photoReference = preferredPhotoReference?.trim() || null;
  if (photoReference && !photoReference.startsWith(`places/${normalizedPlaceId}/photos/`)) {
    photoReference = null;
  }
  if (!photoReference) {
    const photoListResponse = await fetch(
      `${API_BASE}/v1/geo/place-photos/${encodeURIComponent(normalizedPlaceId)}`,
      { headers, cache: "no-store" },
    );
    if (!photoListResponse.ok) {
      throw new Error(`Could not load Google Places photos (${photoListResponse.status}).`);
    }
    const photoList = (await photoListResponse.json()) as GooglePhotoListResponse;
    photoReference = photoList.data?.photos?.[0]?.photoReference?.trim() || null;
  }
  if (!photoReference) return null;

  const photoResponse = await fetch(
    `${API_BASE}/v1/geo/place-photo?ref=${encodeURIComponent(photoReference)}&placeId=${encodeURIComponent(normalizedPlaceId)}&maxWidth=${GOOGLE_COVER_WIDTH}`,
    { headers, cache: "no-store" },
  );
  if (!photoResponse.ok) {
    throw new Error(`Could not download the Google Places cover (${photoResponse.status}).`);
  }

  const contentType = photoResponse.headers.get("content-type") ?? "";
  const buffer = Buffer.from(await photoResponse.arrayBuffer());
  const imageKey = createHash("sha256")
    .update(photoReference)
    .update("\0")
    .update(String(GOOGLE_COVER_WIDTH))
    .digest("hex");
  return storeBusinessImage({
    buffer,
    contentType,
    basename: `${GOOGLE_COVER_FILENAME_PREFIX}${imageKey}`,
  });
}

export async function resolvePermanentBusinessCover(input: {
  googlePlaceId: string | null;
  googlePhotoReference?: string | null;
  requestedCoverImageUrl?: string | null;
  existingCoverImageUrl?: string | null;
  refreshGoogleCover?: boolean;
  useGoogleWhenMissing?: boolean;
}) {
  const requestedCover = input.requestedCoverImageUrl?.trim() || null;
  const existingCover = input.existingCoverImageUrl?.trim() || null;

  if (requestedCover && !isGoogleProxyImageUrl(requestedCover)) return requestedCover;
  if (existingCover && !isGoogleProxyImageUrl(existingCover)) {
    const shouldRefreshStoredGoogleCover = input.refreshGoogleCover && isStoredGoogleCoverUrl(existingCover);
    if (!shouldRefreshStoredGoogleCover) return existingCover;
  }

  if (!input.googlePlaceId || input.useGoogleWhenMissing === false) {
    return requestedCover && !isGoogleProxyImageUrl(requestedCover)
      ? requestedCover
      : existingCover && !isGoogleProxyImageUrl(existingCover)
        ? existingCover
        : null;
  }

  // An external image outage must not roll back an otherwise valid business.
  return persistFirstGooglePlacePhoto(input.googlePlaceId, input.googlePhotoReference).catch(() => null);
}
