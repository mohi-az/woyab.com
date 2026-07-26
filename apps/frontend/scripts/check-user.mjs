import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const envPath = path.resolve("../../packages/database/.env.development");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length > 0) {
        let val = vals.join("=").trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key.trim()] = val;
      }
    }
  }
}

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
console.log("Using DATABASE_URL:", connectionString ? connectionString.replace(/:[^:@]+@/, ":***@") : "NONE");

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

const targetEmail = process.argv[2] || "m.azizzade@gmail.com";

const res = await client.query(
  `SELECT id, email, name, role, active, "twoFactorEnabledAt", "twoFactorSecretEncrypted" IS NOT NULL as "has2faSecret" FROM users WHERE LOWER(email) = LOWER($1)`,
  [targetEmail]
);

console.log(`USER DB RECORD for ${targetEmail}:`, JSON.stringify(res.rows, null, 2));

const allAdmins = await client.query(
  `SELECT id, email, name, role, active, "twoFactorEnabledAt" FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN')`
);
console.log("ALL ADMINS IN DB:", JSON.stringify(allAdmins.rows, null, 2));

await client.end();
