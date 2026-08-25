import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import { ApiError } from "../../errors/api-error.js";
import { logger } from "../../logger/logger.js";

const MAX_PHOTOS = 10;
const PHOTO_CACHE_TTL_MS = 31 * 24 * 60 * 60 * 1000;
const PHOTO_CACHE_DIR = env.GOOGLE_PHOTO_CACHE_DIR
  ? path.resolve(env.GOOGLE_PHOTO_CACHE_DIR)
  : path.join(process.cwd(), ".cache", "google-place-photos");
const photoRequestsInFlight = new Map<string, Promise<PhotoBufferResult | null>>();
const placePhotoListsInFlight = new Map<string, Promise<GooglePhotoItem[]>>();
const placePhotoListMemoryCache = new Map<string, CachedPlacePhotoList>();
const PLACE_IMPORT_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "location",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "businessStatus",
  "primaryType",
  "primaryTypeDisplayName",
  "rating",
  "userRatingCount",
  "regularOpeningHours",
  "photos",
  "reviews",
].join(",");

type GoogleAuthorAttribution = {
  displayName?: string;
  uri?: string;
  photoUri?: string;
};

type GoogleLocalizedText = {
  text?: string;
  languageCode?: string;
};

type GooglePlacePhoto = {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions?: GoogleAuthorAttribution[];
  googleMapsUri?: string;
};

type GooglePlaceResponse = {
  id?: string;
  displayName?: GoogleLocalizedText;
  formattedAddress?: string;
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  primaryType?: string;
  primaryTypeDisplayName?: GoogleLocalizedText;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: {
    periods?: Array<{
      open?: { day?: number; hour?: number; minute?: number };
      close?: { day?: number; hour?: number; minute?: number };
    }>;
    weekdayDescriptions?: string[];
  };
  photos?: GooglePlacePhoto[];
  reviews?: Array<{
    name?: string;
    relativePublishTimeDescription?: string;
    rating?: number;
    text?: GoogleLocalizedText;
    originalText?: GoogleLocalizedText;
    authorAttribution?: GoogleAuthorAttribution;
    publishTime?: string;
    googleMapsUri?: string;
    flagContentUri?: string;
  }>;
};

type PhotoBufferResult = {
  buffer: Buffer;
  contentType: string;
};

type CachedPhotoMetadata = {
  contentType: string;
};

type CachedPlacePhotoList = {
  photos: GooglePhotoItem[];
  fetchedAt: number;
};

export type GooglePhotoItem = {
  photoReference: string;
  width: number;
  height: number;
  htmlAttributions: string[];
  authorAttributions: Array<{
    displayName: string;
    uri: string | null;
    photoUri: string | null;
  }>;
  googleMapsUri: string | null;
};

export type GooglePlaceImportHour = {
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  note: string | null;
};

const GOOGLE_DAY_TO_APP_DAY = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

const APP_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

function configuredApiKey() {
  if (!env.GOOGLE_PLACES_API_KEY) {
    throw ApiError.serviceUnavailable("Google Places is not configured");
  }
  return env.GOOGLE_PLACES_API_KEY;
}

function normalizedAttributions(attributions: GoogleAuthorAttribution[] = []) {
  return attributions.flatMap((attribution) => {
    const displayName = attribution.displayName?.trim();
    if (!displayName) return [];
    return [{
      displayName,
      uri: attribution.uri ?? null,
      photoUri: attribution.photoUri ?? null,
    }];
  });
}

function normalizedPhotos(photos: GooglePlacePhoto[] = []): GooglePhotoItem[] {
  return photos.slice(0, MAX_PHOTOS).map((photo) => {
    const authorAttributions = normalizedAttributions(photo.authorAttributions);
    return {
      photoReference: photo.name,
      width: photo.widthPx,
      height: photo.heightPx,
      htmlAttributions: authorAttributions.map((attribution) => attribution.displayName),
      authorAttributions,
      googleMapsUri: photo.googleMapsUri ?? null,
    };
  });
}

function timeValue(input?: { hour?: number; minute?: number }) {
  if (input?.hour === undefined) return null;
  return `${String(input.hour).padStart(2, "0")}:${String(input.minute ?? 0).padStart(2, "0")}`;
}

function normalizedHours(place: GooglePlaceResponse): GooglePlaceImportHour[] {
  const periodsByDay = new Map<(typeof APP_DAYS)[number], Array<{ openTime: string; closeTime: string }>>();
  if (!place.regularOpeningHours?.periods?.length) return [];

  const [onlyPeriod] = place.regularOpeningHours.periods;
  const isAlwaysOpen = place.regularOpeningHours.periods.length === 1
    && onlyPeriod.open?.day === 0
    && timeValue(onlyPeriod.open) === "00:00"
    && !onlyPeriod.close;
  if (isAlwaysOpen) {
    return APP_DAYS.map((dayOfWeek) => ({
      dayOfWeek,
      openTime: "00:00",
      closeTime: "00:00",
      isClosed: false,
      note: null,
    }));
  }

  for (const period of place.regularOpeningHours.periods) {
    const googleDay = period.open?.day;
    if (googleDay === undefined || googleDay < 0 || googleDay > 6) continue;
    const dayOfWeek = GOOGLE_DAY_TO_APP_DAY[googleDay];
    const openTime = timeValue(period.open);
    // Google omits close for a 24-hour place.
    const closeTime = timeValue(period.close) ?? (openTime === "00:00" ? "00:00" : null);
    if (!openTime || !closeTime) continue;
    periodsByDay.set(dayOfWeek, [...(periodsByDay.get(dayOfWeek) ?? []), { openTime, closeTime }]);
  }

  return APP_DAYS.map((dayOfWeek) => {
    const periods = periodsByDay.get(dayOfWeek) ?? [];
    if (!periods.length) {
      return { dayOfWeek, openTime: null, closeTime: null, isClosed: true, note: null };
    }

    const first = periods[0];
    const last = periods[periods.length - 1];
    const note = periods.length > 1
      ? periods.map((period) => `${period.openTime}-${period.closeTime}`).join(", ")
      : null;
    return {
      dayOfWeek,
      openTime: first.openTime,
      closeTime: last.closeTime,
      isClosed: false,
      note,
    };
  });
}

function addressComponent(place: GooglePlaceResponse, types: string[], useShortText = false) {
  const component = place.addressComponents?.find((item) => item.types?.some((type) => types.includes(type)));
  return (useShortText ? component?.shortText : component?.longText) ?? null;
}

async function fetchPlace(placeId: string, fieldMask: string, languageCode = "de") {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("languageCode", languageCode);
  url.searchParams.set("regionCode", "DE");

  const response = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": configuredApiKey(),
      "X-Goog-FieldMask": fieldMask,
    },
    cache: "no-store",
  });

  if (response.status === 404) throw ApiError.notFound("Google place not found");
  if (!response.ok) {
    const responseText = await response.text();
    logger.warn({ status: response.status, placeId, responseText: responseText.slice(0, 500) }, "Google Places API error");
    if (response.status === 401 || response.status === 403) {
      throw ApiError.serviceUnavailable("Google Places access was denied. Check that Places API (New), billing, and this server's API key restrictions are configured.");
    }
    if (response.status === 429) {
      throw ApiError.serviceUnavailable("Google Places quota was exceeded. Please try again later.");
    }
    if (response.status >= 400 && response.status < 500) throw ApiError.badRequest("Google rejected this Place ID");
    throw ApiError.serviceUnavailable("Google Places is temporarily unavailable");
  }

  return response.json() as Promise<GooglePlaceResponse>;
}

export async function getPlaceImportPreview(placeId: string, languageCode: "de" | "en" | "fa") {
  const place = await fetchPlace(placeId, PLACE_IMPORT_FIELD_MASK, languageCode);
  const locality = addressComponent(place, ["locality", "postal_town", "administrative_area_level_3"]);
  const district = addressComponent(place, ["sublocality_level_1", "sublocality", "neighborhood"]);

  return {
    placeId: place.id ?? placeId,
    displayName: place.displayName?.text?.trim() ?? "",
    displayNameLanguageCode: place.displayName?.languageCode ?? languageCode,
    formattedAddress: place.formattedAddress ?? "",
    city: locality,
    district,
    postalCode: addressComponent(place, ["postal_code"]),
    countryCode: addressComponent(place, ["country"], true),
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
    businessStatus: place.businessStatus ?? null,
    primaryType: place.primaryType ?? null,
    primaryTypeLabel: place.primaryTypeDisplayName?.text ?? null,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? 0,
    hours: normalizedHours(place),
    weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions ?? [],
    hasSplitHours: [...new Set(
      (place.regularOpeningHours?.periods ?? [])
        .map((period) => period.open?.day)
        .filter((day): day is number => day !== undefined),
    )].length < (place.regularOpeningHours?.periods?.length ?? 0),
    photos: normalizedPhotos(place.photos),
    reviews: (place.reviews ?? []).map((review) => ({
      name: review.name ?? null,
      rating: review.rating ?? null,
      text: review.text?.text ?? review.originalText?.text ?? "",
      languageCode: review.text?.languageCode ?? review.originalText?.languageCode ?? null,
      relativePublishTimeDescription: review.relativePublishTimeDescription ?? null,
      publishTime: review.publishTime ?? null,
      googleMapsUri: review.googleMapsUri ?? place.googleMapsUri ?? null,
      flagContentUri: review.flagContentUri ?? null,
      authorAttribution: review.authorAttribution?.displayName
        ? {
            displayName: review.authorAttribution.displayName,
            uri: review.authorAttribution.uri ?? null,
            photoUri: review.authorAttribution.photoUri ?? null,
          }
        : null,
    })),
  };
}

function placePhotoListCachePath(placeId: string) {
  const cacheKey = createHash("sha256").update(placeId).digest("hex");
  return path.join(PHOTO_CACHE_DIR, `place-${cacheKey}.json`);
}

function isCachedPlacePhotoList(value: unknown): value is CachedPlacePhotoList {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CachedPlacePhotoList>;
  return typeof candidate.fetchedAt === "number"
    && Array.isArray(candidate.photos)
    && candidate.photos.every((photo) => (
      photo
      && typeof photo === "object"
      && typeof photo.photoReference === "string"
      && typeof photo.width === "number"
      && typeof photo.height === "number"
    ));
}

async function readCachedPlacePhotoList(placeId: string) {
  const memoryEntry = placePhotoListMemoryCache.get(placeId);
  if (memoryEntry && Date.now() - memoryEntry.fetchedAt < PHOTO_CACHE_TTL_MS) {
    return memoryEntry.photos;
  }
  placePhotoListMemoryCache.delete(placeId);

  const cachePath = placePhotoListCachePath(placeId);
  try {
    const entry = JSON.parse(await readFile(cachePath, "utf8")) as unknown;
    if (!isCachedPlacePhotoList(entry) || Date.now() - entry.fetchedAt >= PHOTO_CACHE_TTL_MS) {
      await rm(cachePath, { force: true });
      return null;
    }
    placePhotoListMemoryCache.set(placeId, entry);
    return entry.photos;
  } catch (error) {
    const code = error instanceof Error && "code" in error
      ? String((error as NodeJS.ErrnoException).code)
      : null;
    await rm(cachePath, { force: true }).catch(() => undefined);
    if (code !== "ENOENT") {
      logger.warn({ error, placeId }, "Failed to read Google Places photo-list cache");
    }
    return null;
  }
}

async function writeCachedPlacePhotoList(placeId: string, entry: CachedPlacePhotoList) {
  const cachePath = placePhotoListCachePath(placeId);
  const temporaryPath = `${cachePath}.${process.pid}-${randomUUID()}.tmp`;
  try {
    await mkdir(PHOTO_CACHE_DIR, { recursive: true });
    await writeFile(temporaryPath, JSON.stringify(entry), "utf8");
    await rename(temporaryPath, cachePath);
  } catch (error) {
    logger.warn({ error, placeId }, "Failed to write Google Places photo-list cache");
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

async function fetchAndCachePlacePhotos(placeId: string): Promise<GooglePhotoItem[]> {
  const cached = await readCachedPlacePhotoList(placeId);
  if (cached) return cached;
  if (!env.GOOGLE_PLACES_API_KEY) return [];

  try {
    const place = await fetchPlace(placeId, "photos");
    const entry = {
      photos: normalizedPhotos(place.photos),
      fetchedAt: Date.now(),
    } satisfies CachedPlacePhotoList;
    placePhotoListMemoryCache.set(placeId, entry);
    await writeCachedPlacePhotoList(placeId, entry);
    return entry.photos;
  } catch (error) {
    logger.error({ error, placeId }, "Failed to fetch Google Places photos");
    return [];
  }
}

/** Cache the Google Places photo list on the server for 31 days. */
export function getPlacePhotos(placeId: string): Promise<GooglePhotoItem[]> {
  const inFlightRequest = placePhotoListsInFlight.get(placeId);
  if (inFlightRequest) return inFlightRequest;

  const request = fetchAndCachePlacePhotos(placeId)
    .finally(() => {
      if (placePhotoListsInFlight.get(placeId) === request) {
        placePhotoListsInFlight.delete(placeId);
      }
    });
  placePhotoListsInFlight.set(placeId, request);
  return request;
}

function photoCacheKey(photoReference: string, maxWidth: number) {
  return createHash("sha256")
    .update(photoReference)
    .update("\0")
    .update(String(maxWidth))
    .digest("hex");
}

function photoCachePaths(cacheKey: string) {
  return {
    image: path.join(PHOTO_CACHE_DIR, `${cacheKey}.bin`),
    metadata: path.join(PHOTO_CACHE_DIR, `${cacheKey}.json`),
  };
}

async function removePhotoCacheEntry(paths: ReturnType<typeof photoCachePaths>) {
  await Promise.all([
    rm(paths.image, { force: true }),
    rm(paths.metadata, { force: true }),
  ]);
}

async function readCachedPhoto(cacheKey: string): Promise<PhotoBufferResult | null> {
  const paths = photoCachePaths(cacheKey);

  try {
    const imageStats = await stat(paths.image);
    if (Date.now() - imageStats.mtimeMs >= PHOTO_CACHE_TTL_MS) {
      await removePhotoCacheEntry(paths);
      return null;
    }

    const [buffer, rawMetadata] = await Promise.all([
      readFile(paths.image),
      readFile(paths.metadata, "utf8"),
    ]);
    const metadata = JSON.parse(rawMetadata) as Partial<CachedPhotoMetadata>;
    if (!metadata.contentType?.startsWith("image/")) {
      await removePhotoCacheEntry(paths);
      return null;
    }

    return { buffer, contentType: metadata.contentType };
  } catch (error) {
    const code = error instanceof Error && "code" in error
      ? String((error as NodeJS.ErrnoException).code)
      : null;
    await removePhotoCacheEntry(paths).catch(() => undefined);
    if (code !== "ENOENT") {
      logger.warn({ error, cacheKey }, "Failed to read Google Places photo cache");
    }
    return null;
  }
}

async function writeCachedPhoto(cacheKey: string, result: PhotoBufferResult) {
  const paths = photoCachePaths(cacheKey);
  const temporarySuffix = `${process.pid}-${randomUUID()}.tmp`;
  const temporaryPaths = {
    image: `${paths.image}.${temporarySuffix}`,
    metadata: `${paths.metadata}.${temporarySuffix}`,
  };

  try {
    await mkdir(PHOTO_CACHE_DIR, { recursive: true });
    await Promise.all([
      writeFile(temporaryPaths.image, result.buffer),
      writeFile(
        temporaryPaths.metadata,
        JSON.stringify({ contentType: result.contentType } satisfies CachedPhotoMetadata),
        "utf8",
      ),
    ]);
    await rename(temporaryPaths.image, paths.image);
    await rename(temporaryPaths.metadata, paths.metadata);
  } catch (error) {
    logger.warn({ error, cacheKey }, "Failed to write Google Places photo cache");
  } finally {
    await Promise.all([
      rm(temporaryPaths.image, { force: true }),
      rm(temporaryPaths.metadata, { force: true }),
    ]).catch(() => undefined);
  }
}

async function fetchAndCachePhoto(
  photoReference: string,
  maxWidth: number,
  cacheKey: string,
): Promise<PhotoBufferResult | null> {
  const cached = await readCachedPhoto(cacheKey);
  if (cached) return cached;
  if (!env.GOOGLE_PLACES_API_KEY) return null;

  try {
    const url = `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=${maxWidth}`;
    const response = await fetch(url, {
      headers: { "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY },
      cache: "no-store",
    });
    if (!response.ok) {
      logger.warn({ status: response.status, photoReference }, "Google Places Photo API error");
      return null;
    }
    const result = {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") ?? "image/jpeg",
    };
    await writeCachedPhoto(cacheKey, result);
    return result;
  } catch (error) {
    logger.error({ error, photoReference }, "Failed to fetch Google Places photo");
    return null;
  }
}

/** Cache Google Places photo bytes on the server for 31 days. */
export function getPhotoBuffer(
  photoReference: string,
  maxWidth = 800,
): Promise<PhotoBufferResult | null> {
  const cacheKey = photoCacheKey(photoReference, maxWidth);
  const inFlightRequest = photoRequestsInFlight.get(cacheKey);
  if (inFlightRequest) return inFlightRequest;

  const request = fetchAndCachePhoto(photoReference, maxWidth, cacheKey)
    .finally(() => {
      if (photoRequestsInFlight.get(cacheKey) === request) {
        photoRequestsInFlight.delete(cacheKey);
      }
    });
  photoRequestsInFlight.set(cacheKey, request);
  return request;
}
