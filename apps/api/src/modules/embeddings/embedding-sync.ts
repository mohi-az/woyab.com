import { logger } from "../../logger/logger.js";
import { buildBusinessDocument } from "./document-builder.js";
import { embedDocument } from "./gemini-embedding.js";
import {
  deleteEmbedding,
  getBusinessForDocument,
  getEmbeddingByBusinessId,
  upsertEmbedding,
} from "./embedding.repository.js";
import { isSemanticSearchAvailable } from "./embedding.service.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const DEBOUNCE_MS = 2_000;
const MAX_CONCURRENT = 2;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 3_000;

// ---------------------------------------------------------------------------
// In-memory debounce map & processing queue
// ---------------------------------------------------------------------------
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const processingSet = new Set<string>();
let activeCount = 0;
const waitingQueue: string[] = [];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Schedule a background embedding update for a business.
 * Debounces rapid successive calls (e.g. multiple field updates)
 * and processes asynchronously to avoid blocking the HTTP response.
 */
export function scheduleEmbeddingUpdate(businessId: string): void {
  if (!isSemanticSearchAvailable()) return;

  // Clear any existing timer for this business (debounce)
  const existing = pendingTimers.get(businessId);
  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    pendingTimers.delete(businessId);
    enqueue(businessId);
  }, DEBOUNCE_MS);

  pendingTimers.set(businessId, timer);
}

/**
 * Remove the embedding record when a business is deleted.
 * Runs fire-and-forget in the background.
 */
export function scheduleEmbeddingDeletion(businessId: string): void {
  if (!isSemanticSearchAvailable()) return;

  // Cancel any pending update
  const existing = pendingTimers.get(businessId);
  if (existing) {
    clearTimeout(existing);
    pendingTimers.delete(businessId);
  }

  setImmediate(async () => {
    try {
      await deleteEmbedding(businessId);
      logger.info({ businessId }, "Embedding deleted after business removal");
    } catch (error) {
      logger.error(
        { businessId, error: (error as Error).message },
        "Failed to delete embedding after business removal",
      );
    }
  });
}

/**
 * Returns a snapshot of the sync queue state (useful for health checks / debugging).
 */
export function getSyncQueueStatus() {
  return {
    pendingDebounce: pendingTimers.size,
    activeProcessing: activeCount,
    waitingInQueue: waitingQueue.length,
    processingBusinessIds: [...processingSet],
  };
}

// ---------------------------------------------------------------------------
// Internal queue management
// ---------------------------------------------------------------------------

function enqueue(businessId: string): void {
  // Avoid duplicate entries in the queue
  if (processingSet.has(businessId) || waitingQueue.includes(businessId)) {
    return;
  }

  if (activeCount < MAX_CONCURRENT) {
    processBusinessEmbedding(businessId);
  } else {
    waitingQueue.push(businessId);
  }
}

function drainQueue(): void {
  while (activeCount < MAX_CONCURRENT && waitingQueue.length > 0) {
    const nextId = waitingQueue.shift()!;
    processBusinessEmbedding(nextId);
  }
}

// ---------------------------------------------------------------------------
// Core processing logic
// ---------------------------------------------------------------------------

async function processBusinessEmbedding(businessId: string): Promise<void> {
  activeCount++;
  processingSet.add(businessId);

  try {
    await processWithRetry(businessId, 0);
  } catch (error) {
    logger.error(
      { businessId, error: (error as Error).message },
      "Embedding auto-sync failed after all retries",
    );
  } finally {
    activeCount--;
    processingSet.delete(businessId);
    drainQueue();
  }
}

async function processWithRetry(businessId: string, attempt: number): Promise<void> {
  try {
    // 1. Load business with all relations for document building
    const business = await getBusinessForDocument(businessId);
    if (!business) {
      logger.warn({ businessId }, "Business not found during auto-sync, skipping embedding update");
      return;
    }

    // 2. Build document & compute hash
    const doc = buildBusinessDocument(business);

    // 3. Hash-based skip: only re-embed if the document content actually changed
    const existingEmbedding = await getEmbeddingByBusinessId(businessId);
    if (existingEmbedding && existingEmbedding.documentHash === doc.hash) {
      logger.debug(
        { businessId, hash: doc.hash },
        "Document hash unchanged, skipping re-embedding",
      );
      return;
    }

    // 4. Generate embedding vector via Gemini API
    const vector = await embedDocument(doc.text);

    // 5. Upsert into pgvector
    await upsertEmbedding({
      businessId,
      embedding: vector,
      documentText: doc.text,
      documentHash: doc.hash,
    });

    logger.info(
      { businessId, hash: doc.hash, wasUpdate: Boolean(existingEmbedding) },
      "Embedding auto-synced successfully",
    );
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      logger.warn(
        { businessId, attempt: attempt + 1, maxRetries: MAX_RETRIES, delayMs: delay, error: (error as Error).message },
        "Embedding auto-sync attempt failed, scheduling retry",
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return processWithRetry(businessId, attempt + 1);
    }
    throw error;
  }
}
