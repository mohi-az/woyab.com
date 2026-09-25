import { Prisma } from "@woyab/database";
import { prisma } from "../lib/prisma.js";
import { buildBusinessDocument } from "../modules/embeddings/document-builder.js";
import { embedDocumentBatch } from "../modules/embeddings/gemini-embedding.js";
import {
  getBusinessesForDocuments,
  upsertEmbedding,
} from "../modules/embeddings/embedding.repository.js";

type ScriptOptions = {
  force: boolean;
  dryRun: boolean;
  limit?: number;
  batchSize: number;
  delayMs: number;
  createIndex: boolean;
};

function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    force: false,
    dryRun: false,
    batchSize: 20,
    delayMs: 3000,
    createIndex: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--force") {
      options.force = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--no-index") {
      options.createIndex = false;
    } else if (arg === "--batch-size" && args[i + 1]) {
      options.batchSize = Math.max(1, Math.min(100, parseInt(args[++i], 10) || 50));
    } else if (arg === "--limit" && args[i + 1]) {
      options.limit = Math.max(1, parseInt(args[++i], 10) || 100);
    } else if (arg === "--delay" && args[i + 1]) {
      options.delayMs = Math.max(0, parseInt(args[++i], 10) || 1500);
    }
  }

  return options;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getCandidateBusinessIds(options: ScriptOptions): Promise<string[]> {
  const limitClause = options.limit ? Prisma.sql`LIMIT ${options.limit}` : Prisma.empty;

  if (options.force) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM businesses
      WHERE status = 'ACTIVE'
        AND verified = TRUE
        AND "removedAt" IS NULL
      ORDER BY "updatedAt" DESC
      ${limitClause}
    `);
    return rows.map((r) => r.id);
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT b.id
    FROM businesses b
    LEFT JOIN business_embeddings be ON be."businessId" = b.id
    WHERE b.status = 'ACTIVE'
      AND b.verified = TRUE
      AND b."removedAt" IS NULL
      AND (be.id IS NULL OR b."updatedAt" > be."updatedAt")
    ORDER BY b."updatedAt" DESC
    ${limitClause}
  `);

  return rows.map((r) => r.id);
}

async function ensureHnswIndex(): Promise<void> {
  console.log("\n[HNSW Index] Ensuring vector HNSW index exists...");
  try {
    await prisma.$executeRaw(Prisma.sql`
      CREATE INDEX IF NOT EXISTS business_embeddings_embedding_idx
        ON business_embeddings
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    `);
    console.log("[HNSW Index] Vector index is ready.");
  } catch (error) {
    console.warn("[HNSW Index] Note on index creation:", (error as Error).message);
  }
}

async function run(): Promise<void> {
  const startTime = Date.now();
  const options = parseArgs();

  console.log("=================================================");
  console.log("   WoYab Semantic Search - Batch Indexer");
  console.log("=================================================");
  console.log(`Configuration:`, {
    forceReindex: options.force,
    dryRun: options.dryRun,
    batchSize: options.batchSize,
    limit: options.limit ?? "ALL",
    delayMs: options.delayMs,
  });

  const businessIds = await getCandidateBusinessIds(options);
  const total = businessIds.length;

  if (total === 0) {
    console.log("\nNo businesses require embedding indexing. All embeddings are up to date!");
    if (options.createIndex) {
      await ensureHnswIndex();
    }
    return;
  }

  console.log(`\nFound ${total} business(es) requiring indexing.`);

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < total; i += options.batchSize) {
    const chunkIds = businessIds.slice(i, i + options.batchSize);
    const chunkNum = Math.floor(i / options.batchSize) + 1;
    const totalChunks = Math.ceil(total / options.batchSize);

    console.log(`\n--- Batch ${chunkNum}/${totalChunks} (Items ${i + 1} to ${Math.min(i + options.batchSize, total)} of ${total}) ---`);

    try {
      const businesses = await getBusinessesForDocuments(chunkIds);
      if (businesses.length === 0) continue;

      const documents = businesses.map(buildBusinessDocument);

      if (options.dryRun) {
        console.log(`[DRY RUN] Generated ${documents.length} document representations.`);
        documents.slice(0, 2).forEach((doc, idx) => {
          console.log(`  Sample ${idx + 1} (${doc.businessId}): ${doc.text.slice(0, 100)}...`);
        });
        successCount += documents.length;
        continue;
      }

      const texts = documents.map((d) => d.text);
      console.log(`Requesting embeddings for ${texts.length} documents from Gemini API...`);

      const embeddings = await embedDocumentBatch(texts);

      console.log(`Received ${embeddings.length} embedding vectors. Saving to database...`);

      for (let j = 0; j < businesses.length; j++) {
        const business = businesses[j];
        const doc = documents[j];
        const embedding = embeddings[j];

        await upsertEmbedding({
          businessId: business.id,
          embedding,
          documentText: doc.text,
          documentHash: doc.hash,
        });
      }

      successCount += businesses.length;
      console.log(`Batch ${chunkNum} completed successfully.`);
    } catch (err) {
      failureCount += chunkIds.length;
      console.error(`Batch ${chunkNum} failed:`, (err as Error).message);
    }

    if (i + options.batchSize < total && options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  if (options.createIndex && !options.dryRun && successCount > 0) {
    await ensureHnswIndex();
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n=================================================");
  console.log("   Batch Indexing Finished");
  console.log("=================================================");
  console.log(`Total Target: ${total}`);
  console.log(`Successfully Indexed: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log(`Duration: ${durationSec}s`);
  console.log("=================================================\n");
}

run()
  .catch((err) => {
    console.error("Fatal error during batch indexing:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
