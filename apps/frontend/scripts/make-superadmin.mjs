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

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

const email = "m.azizzade@gmail.com";
const result = await client.query(
  `UPDATE users SET role = 'SUPER_ADMIN', "authVersion" = "authVersion" + 1, "updatedAt" = NOW() WHERE LOWER(email) = LOWER($1) RETURNING id, email, name, role, active, "twoFactorEnabledAt"`,
  [email]
);

console.log("UPDATED USER RECORD:", JSON.stringify(result.rows[0], null, 2));

await client.end();
