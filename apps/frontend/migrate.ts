import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@fargo/database/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const envStr = readFileSync(join(process.cwd(), "..", "..", "packages", "database", ".env"), "utf8");
const dbUrlMatch = envStr.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
if (dbUrlMatch) {
  process.env.DATABASE_URL = dbUrlMatch[1];
}

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);

  try {
    const result = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "claim_notes"`);
    console.log("SUCCESS! claim_notes exists, count:", result);
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
