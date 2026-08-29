import { z } from "zod";

export const aiBusinessImportStatuses = [
  "QUEUED",
  "FETCHING_GOOGLE",
  "FETCHING_WEBSITE",
  "ANALYZING",
  "READY",
  "FAILED",
  "APPLIED",
  "DISCARDED",
] as const;

export const evidenceConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const evidenceSourceSchema = z.enum(["GOOGLE", "OFFICIAL_WEBSITE", "GENERATED"]);

export const proposalEvidenceSchema = z.object({
  field: z.string().trim().min(1).max(120),
  source: evidenceSourceSchema,
  confidence: evidenceConfidenceSchema,
  url: z.string().url().max(2_048).nullable(),
  excerpt: z.string().trim().max(500).nullable(),
});

const translationSchema = z.object({
  businessName: z.string().trim().min(1).max(180),
  shortDescription: z.string().trim().max(300).nullable(),
  description: z.string().trim().max(5_000).nullable(),
});

const taxonomySuggestionSchema = z.object({
  nameEn: z.string().trim().min(1).max(120),
  nameDe: z.string().trim().min(1).max(120),
  nameFa: z.string().trim().min(1).max(120),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(120).nullable(),
});

export const taxonomyChoiceSchema = z.object({
  existingId: z.number().int().positive().nullable(),
  suggested: taxonomySuggestionSchema.nullable(),
  confidence: evidenceConfidenceSchema,
  reason: z.string().trim().max(500),
}).superRefine((value, context) => {
  if ((value.existingId === null) === (value.suggested === null)) {
    context.addIssue({ code: "custom", message: "Choose exactly one existing or suggested taxonomy item." });
  }
});

export const aiBusinessProposalSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(100),
  sourceLocale: z.enum(["DE", "EN", "FA"]),
  legalName: z.string().trim().max(240).nullable(),
  translations: z.object({
    DE: translationSchema,
    EN: translationSchema,
    FA: translationSchema,
  }),
  contact: z.object({
    email: z.string().email().max(320).nullable(),
    phone: z.string().trim().max(30).nullable(),
    mobile: z.string().trim().max(30).nullable(),
    whatsapp: z.string().trim().max(30).nullable(),
    website: z.string().url().max(2_048).nullable(),
    instagram: z.string().url().max(2_048).nullable(),
    telegram: z.string().url().max(2_048).nullable(),
    facebook: z.string().url().max(2_048).nullable(),
    youtube: z.string().url().max(2_048).nullable(),
    linkedin: z.string().url().max(2_048).nullable(),
  }),
  details: z.object({
    establishedYear: z.number().int().min(1800).max(2100).nullable(),
    priceRange: z.enum(["BUDGET", "MODERATE", "EXPENSIVE", "LUXURY"]).nullable(),
  }),
  location: z.object({
    address: z.string().trim().max(1_000).nullable(),
    postalCode: z.string().trim().max(16).nullable(),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    cityId: z.number().int().positive().nullable(),
    districtId: z.number().int().positive().nullable(),
  }),
  hours: z.array(z.object({
    dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
    openTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    isClosed: z.boolean(),
    note: z.string().trim().max(200).nullable(),
  })).max(28),
  taxonomy: z.object({
    category: taxonomyChoiceSchema,
    subCategory: taxonomyChoiceSchema.nullable(),
  }),
  tagIds: z.array(z.number().int().positive()).max(30),
  attributes: z.array(z.object({
    attributeId: z.number().int().positive(),
    value: z.string().trim().max(1_000),
  })).max(50),
  evidence: z.array(proposalEvidenceSchema).max(120),
  conflicts: z.array(z.object({
    field: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(700),
  })).max(50),
  warnings: z.array(z.string().trim().min(1).max(700)).max(50),
});

export type AiBusinessProposal = z.infer<typeof aiBusinessProposalSchema>;
export type ProposalEvidence = z.infer<typeof proposalEvidenceSchema>;
export type TaxonomyChoice = z.infer<typeof taxonomyChoiceSchema>;
export type AiBusinessImportStatus = (typeof aiBusinessImportStatuses)[number];

export type PublicAiBusinessImport = {
  id: string;
  placeId: string;
  status: AiBusinessImportStatus;
  provider: "OPENAI" | "GEMINI";
  model: string;
  googleSnapshot: Record<string, unknown> | null;
  websiteEvidence: Record<string, unknown> | null;
  proposal: AiBusinessProposal | null;
  reviewState: Record<string, unknown> | null;
  warnings: string[];
  errorCode: string | null;
  errorMessage: string | null;
  attemptCount: number;
  completedAt: string | null;
  appliedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};
