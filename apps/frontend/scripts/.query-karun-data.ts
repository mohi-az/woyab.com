import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@woyab/database/client";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);
async function main() {
  const b = await prisma.business.findUnique({ where: { id: "cmtbqooka0000ochk6tpswn6f" }, include: { attributes: { include: { attribute: true } }, tags: { include: { tag: true } }, translations: true } });
  const defs = await prisma.attributeDefinition.findMany({ where: { active: true }, orderBy: { id: "asc" } });
  const tags = await prisma.tag.findMany({ orderBy: { id: "asc" } });
  console.log(JSON.stringify({ business: b, definitions: defs, tags }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); await pool.end(); });
