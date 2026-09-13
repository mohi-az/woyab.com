import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@woyab/database";

import { env } from "../config/env.js";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  connectionTimeoutMillis: 5_000,
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
