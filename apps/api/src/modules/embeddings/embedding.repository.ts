import { Prisma } from "@woyab/database";
import { prisma } from "../../lib/prisma.js";
import { businessDocumentInclude, type BusinessForDocument } from "./document-builder.js";

export type SimilarBusinessMatch = {
  businessId: string;
  similarity: number;
};

export type EmbeddingFilters = {
  categoryId?: number;
  subCategoryId?: number;
  cityId?: number;
  tagIds?: number[];
};

export type EmbeddingStats = {
  totalBusinesses: number;
  totalEmbedded: number;
  staleCount: number;
  lastIndexedAt: Date | null;
  totalTokens: number;
};

export type BusinessEmbeddingRecord = {
  id: string;
  businessId: string;
  documentText: string;
  documentHash: string;
  model: string;
  tokenCount: number | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Inserts or updates the embedding vector and metadata for a business.
 * Uses raw SQL due to pgvector custom type mapping.
 */
export async function upsertEmbedding(params: {
  businessId: string;
  embedding: number[];
  documentText: string;
  documentHash: string;
  model?: string;
  tokenCount?: number | null;
}): Promise<void> {
  const model = params.model ?? "text-embedding-004";
  const tokenCount = params.tokenCount ?? null;
  const vectorStr = `[${params.embedding.join(",")}]`;

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO business_embeddings (
      id,
      "businessId",
      embedding,
      "documentText",
      "documentHash",
      model,
      "tokenCount",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      gen_random_uuid()::text,
      ${params.businessId},
      ${vectorStr}::vector,
      ${params.documentText},
      ${params.documentHash},
      ${model},
      ${tokenCount},
      NOW(),
      NOW()
    )
    ON CONFLICT ("businessId") DO UPDATE SET
      embedding = ${vectorStr}::vector,
      "documentText" = ${params.documentText},
      "documentHash" = ${params.documentHash},
      model = ${model},
      "tokenCount" = ${tokenCount},
      "updatedAt" = NOW()
  `);
}

/**
 * Searches for businesses semantically similar to a query embedding vector.
 * Ranks by cosine distance (<=>) and returns similarity scores in range [0, 1].
 */
export async function findSimilarBusinesses(params: {
  queryEmbedding: number[];
  filters?: EmbeddingFilters;
  limit?: number;
  minSimilarity?: number;
}): Promise<SimilarBusinessMatch[]> {
  const { queryEmbedding, filters = {}, limit = 20, minSimilarity = 0.3 } = params;
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  const conditions = [
    Prisma.sql`b."status" = 'ACTIVE'::"business_status"`,
    Prisma.sql`b."verified" = TRUE`,
    Prisma.sql`b."removedAt" IS NULL`,
    Prisma.sql`be.embedding IS NOT NULL`,
    Prisma.sql`1 - (be.embedding <=> ${vectorStr}::vector) >= ${minSimilarity}`,
  ];

  if (filters.categoryId !== undefined) {
    conditions.push(Prisma.sql`b."categoryId" = ${filters.categoryId}`);
  }
  if (filters.subCategoryId !== undefined) {
    conditions.push(Prisma.sql`b."subCategoryId" = ${filters.subCategoryId}`);
  }
  if (filters.cityId !== undefined) {
    conditions.push(Prisma.sql`b."cityId" = ${filters.cityId}`);
  }
  if (filters.tagIds && filters.tagIds.length > 0) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "business_tags" bt
      WHERE bt."businessId" = b.id AND bt."tagId" IN (${Prisma.join(filters.tagIds)})
    )`);
  }

  const whereClause = Prisma.join(conditions, " AND ");

  return prisma.$queryRaw<SimilarBusinessMatch[]>(Prisma.sql`
    SELECT
      be."businessId",
      (1 - (be.embedding <=> ${vectorStr}::vector))::double precision AS similarity
    FROM business_embeddings be
    JOIN businesses b ON b.id = be."businessId"
    WHERE ${whereClause}
    ORDER BY be.embedding <=> ${vectorStr}::vector ASC
    LIMIT ${limit}
  `);
}

/**
 * Aggregates statistics regarding embeddings for the admin dashboard.
 */
export async function getEmbeddingStats(): Promise<EmbeddingStats> {
  const results = await prisma.$queryRaw<EmbeddingStats[]>(Prisma.sql`
    SELECT
      (SELECT COUNT(*)::int FROM businesses WHERE status = 'ACTIVE' AND verified = TRUE AND "removedAt" IS NULL) AS "totalBusinesses",
      (SELECT COUNT(*)::int FROM business_embeddings) AS "totalEmbedded",
      (SELECT COUNT(*)::int FROM business_embeddings be
       JOIN businesses b ON b.id = be."businessId"
       WHERE b."updatedAt" > be."updatedAt") AS "staleCount",
      (SELECT MAX("updatedAt") FROM business_embeddings) AS "lastIndexedAt",
      (SELECT COALESCE(SUM("tokenCount"), 0)::int FROM business_embeddings) AS "totalTokens"
  `);

  return (
    results[0] ?? {
      totalBusinesses: 0,
      totalEmbedded: 0,
      staleCount: 0,
      lastIndexedAt: null,
      totalTokens: 0,
    }
  );
}

/**
 * Fetches an embedding metadata record for a specific business ID.
 */
export async function getEmbeddingByBusinessId(
  businessId: string,
): Promise<BusinessEmbeddingRecord | null> {
  const results = await prisma.$queryRaw<BusinessEmbeddingRecord[]>(Prisma.sql`
    SELECT
      id,
      "businessId",
      "documentText",
      "documentHash",
      model,
      "tokenCount",
      "createdAt",
      "updatedAt"
    FROM business_embeddings
    WHERE "businessId" = ${businessId}
    LIMIT 1
  `);

  return results[0] ?? null;
}

/**
 * Deletes the embedding record for a business.
 */
export async function deleteEmbedding(businessId: string): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM business_embeddings WHERE "businessId" = ${businessId}
  `);
}

/**
 * Finds business IDs of all active businesses that do not yet have an embedding
 * or whose business record has been updated since the embedding was generated.
 */
export async function getBusinessIdsNeedingEmbedding(limit = 100): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT b.id
    FROM businesses b
    LEFT JOIN business_embeddings be ON be."businessId" = b.id
    WHERE b.status = 'ACTIVE'
      AND b.verified = TRUE
      AND b."removedAt" IS NULL
      AND (be.id IS NULL OR b."updatedAt" > be."updatedAt")
    ORDER BY b."updatedAt" DESC
    LIMIT ${limit}
  `);

  return rows.map((r) => r.id);
}

/**
 * Loads a single business with all related data required for building
 * its semantic indexing document.
 */
export async function getBusinessForDocument(
  businessId: string,
): Promise<BusinessForDocument | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: businessDocumentInclude,
  });

  return (business as unknown as BusinessForDocument) ?? null;
}

/**
 * Loads a batch of businesses by IDs with all relations needed for document building.
 */
export async function getBusinessesForDocuments(
  businessIds: string[],
): Promise<BusinessForDocument[]> {
  if (businessIds.length === 0) return [];

  const businesses = await prisma.business.findMany({
    where: {
      id: { in: businessIds },
    },
    include: businessDocumentInclude,
  });

  return businesses as unknown as BusinessForDocument[];
}
