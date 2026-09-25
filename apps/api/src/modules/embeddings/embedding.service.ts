import type { AppLocale } from "@woyab/shared";
import { env } from "../../config/env.js";
import { ApiError } from "../../errors/api-error.js";
import { logger } from "../../logger/logger.js";
import { businessRepository } from "../businesses/business.repository.js";
import {
  localizeBusiness,
} from "../businesses/business-localization.js";
import { buildBusinessDocument } from "./document-builder.js";
import {
  embedDocument,
  embedQuery,
} from "./gemini-embedding.js";
import {
  findSimilarBusinesses,
  getBusinessForDocument,
  getEmbeddingByBusinessId,
  getEmbeddingStats,
  upsertEmbedding,
  type EmbeddingFilters,
  type EmbeddingStats,
} from "./embedding.repository.js";
import type { SemanticSearchInput, TestSearchInput } from "./embedding.schema.js";

function stripTranslations<T extends { translations?: unknown }>(item: T) {
  const { translations: _translations, ...rest } = item;
  return rest;
}

export function isSemanticSearchAvailable(): boolean {
  return Boolean(env.GEMINI_EMBEDDING_API_KEY || process.env.GEMINI_EMBEDDING_API_KEY);
}

export const embeddingService = {
  isAvailable: isSemanticSearchAvailable,

  search: async (input: SemanticSearchInput) => {
    if (!isSemanticSearchAvailable()) {
      throw ApiError.serviceUnavailable("Semantic search service is not configured with an API key");
    }

    const {
      query,
      locale = "fa",
      categoryId,
      subCategoryId,
      cityId,
      tagIds,
      limit = 20,
      minSimilarity = 0.6,
    } = input;

    const queryEmbedding = await embedQuery(query);

    const filters: EmbeddingFilters = {
      categoryId,
      subCategoryId,
      cityId,
      tagIds,
    };

    const matches = await findSimilarBusinesses({
      queryEmbedding,
      filters,
      limit,
      minSimilarity,
    });

    if (matches.length === 0) {
      return {
        items: [],
        total: 0,
        limit,
        isSemantic: true,
      };
    }

    const similarityMap = new Map<string, number>(
      matches.map((m) => [m.businessId, m.similarity]),
    );

    const businesses = await businessRepository.findManyByIds(
      matches.map((m) => m.businessId),
    );

    const localized = businesses.map((b) => {
      const loc = localizeBusiness(b, locale as AppLocale);
      const similarity = similarityMap.get(b.id) ?? 0;
      return {
        ...stripTranslations(loc),
        similarityScore: Math.round(similarity * 1000) / 1000,
      };
    });

    // Maintain ranking ordered by similarity descending
    localized.sort((a, b) => b.similarityScore - a.similarityScore);

    return {
      items: localized,
      total: localized.length,
      limit,
      isSemantic: true,
    };
  },

  reindexSingle: async (businessId: string) => {
    const business = await getBusinessForDocument(businessId);
    if (!business) {
      throw ApiError.notFound(`Business with ID "${businessId}" was not found`);
    }

    const doc = buildBusinessDocument(business);
    const vector = await embedDocument(doc.text);

    await upsertEmbedding({
      businessId,
      embedding: vector,
      documentText: doc.text,
      documentHash: doc.hash,
    });

    logger.info({ businessId, hash: doc.hash }, "Business embedding reindexed successfully");

    return {
      success: true,
      businessId,
      documentHash: doc.hash,
      documentLength: doc.text.length,
    };
  },

  getStats: async (): Promise<EmbeddingStats> => {
    return getEmbeddingStats();
  },

  testSearch: async (input: TestSearchInput) => {
    const { query, limit = 10, minSimilarity = 0.2 } = input;

    const embedStart = Date.now();
    const queryVector = await embedQuery(query);
    const embedTimeMs = Date.now() - embedStart;

    const searchStart = Date.now();
    const matches = await findSimilarBusinesses({
      queryEmbedding: queryVector,
      limit,
      minSimilarity,
    });
    const searchTimeMs = Date.now() - searchStart;

    const enrichedResults = await Promise.all(
      matches.map(async (match) => {
        const [business, embeddingMeta] = await Promise.all([
          businessRepository.findById(match.businessId),
          getEmbeddingByBusinessId(match.businessId),
        ]);

        return {
          businessId: match.businessId,
          businessName: business?.businessName ?? "Unknown",
          slug: business?.slug ?? "",
          similarity: Math.round(match.similarity * 1000) / 1000,
          documentSnippet: embeddingMeta?.documentText
            ? embeddingMeta.documentText.slice(0, 200) + "..."
            : null,
          lastUpdated: embeddingMeta?.updatedAt ?? null,
        };
      }),
    );

    return {
      query,
      embedTimeMs,
      searchTimeMs,
      totalMatches: matches.length,
      results: enrichedResults,
    };
  },
};
