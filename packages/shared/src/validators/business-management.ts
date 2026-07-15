import { z } from "zod";

export const businessClaimCreateSchema = z.object({
  businessId: z.string().min(1).max(191),
  claimantName: z.string().trim().min(2).max(120),
  officialBusinessEmail: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  officialUrl: z.string().trim().pipe(z.url().max(2048).refine((value) => value.startsWith("https://"), "Use an HTTPS URL.")).optional(),
  termsAccepted: z.literal(true),
  privacyNoticeAccepted: z.literal(true),
});

export const businessClaimVerifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
});

export const businessChangeFieldSchema = z.enum([
  "businessName",
  "shortDescription",
  "description",
  "legalName",
  "email",
  "phone",
  "mobile",
  "whatsapp",
  "website",
  "instagram",
  "telegram",
  "facebook",
  "youtube",
  "linkedin",
  "address",
  "postalCode",
  "categoryId",
  "subCategoryId",
  "specialtyId",
  "cityId",
  "districtId",
  "latitude",
  "longitude",
  "establishedYear",
  "priceRange",
]);

export const businessChangeRequestCreateSchema = z.object({
  businessId: z.string().min(1).max(191),
  submitterRelation: z.enum(["OWNER", "EMPLOYEE", "CUSTOMER"]),
  kind: z.enum(["DETAILS", "HOURS", "ATTRIBUTES", "TAGS", "SERVICE_CREATE", "SERVICE_UPDATE", "SERVICE_DEACTIVATE"]),
  payload: z.record(z.string(), z.unknown()),
  additionalContext: z.string().trim().max(2000).optional(),
  evidenceUrl: z.string().trim().pipe(z.url().max(2048).refine((value) => value.startsWith("https://"), "Use an HTTPS URL.")).optional(),
});

export const publicBusinessDetailsChangeSchema = z.object({
  changes: z.array(z.object({
    field: businessChangeFieldSchema,
    value: z.string().trim().max(5000),
  })).max(30).default([]),
  translations: z.array(z.object({
    locale: z.enum(["DE", "EN", "FA"]),
    businessName: z.string().trim().min(1).max(200),
    shortDescription: z.string().trim().max(300).nullable().optional(),
    description: z.string().trim().max(5000).nullable().optional(),
  })).max(3).optional(),
}).refine((input) => input.changes.length > 0 || Boolean(input.translations?.length), "At least one change is required.");

export const businessClaimErrorCodes = [
  "AUTH_REQUIRED",
  "CLAIM_ALREADY_ACTIVE",
  "OTP_INVALID",
  "OTP_EXPIRED",
  "OTP_BLOCKED",
  "EMAIL_DELIVERY_FAILED",
  "OWNER_REVIEW_REQUIRED",
  "BUSINESS_ALREADY_OWNED",
  "STALE_CHANGE_REQUEST",
  "BUSINESS_REMOVED",
] as const;

export type BusinessClaimCreateInput = z.infer<typeof businessClaimCreateSchema>;
export type BusinessChangeRequestCreateInput = z.infer<typeof businessChangeRequestCreateSchema>;
export type BusinessClaimErrorCode = (typeof businessClaimErrorCodes)[number];
