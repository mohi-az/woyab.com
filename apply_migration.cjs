const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

async function run() {
  console.log("Connecting to database using pg driver...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const migrationPath = path.join(__dirname, "packages", "database", "prisma", "migrations", "20260727100000_add_claim_notes", "migration.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");
    console.log("Read migration SQL. Executing...");
    
    // Split statements on semi-colons (basic approach for this simple migration)
    const statements = sql.split(";").filter(s => s.trim().length > 0);
    
    for (let stmt of statements) {
      console.log("Executing statement:", stmt.trim().substring(0, 50) + "...");
      await pool.query(stmt);
    }
    
    console.log("Migration applied successfully!");
    
    // Manually record the migration in _prisma_migrations so Prisma knows it was applied
    const checksum = "manual_apply"; // Dummy checksum
    await pool.query(`
      INSERT INTO "_prisma_migrations" 
      ("id", "checksum", "bytes_applied", "applied_steps_count", "migration_name", "logs", "started_at", "finished_at") 
      VALUES 
      ($1, $2, $3, 1, '20260727100000_add_claim_notes', NULL, NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `, ["20260727100000_add_claim_notes", checksum, sql.length]);
    console.log("Marked as applied in _prisma_migrations.");

  } catch (err) {
    console.error("Error applying migration:", err);
  } finally {
    await pool.end();
  }
}

run();
