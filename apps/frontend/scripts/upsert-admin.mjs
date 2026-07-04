import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

const email = (readArg("email") ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = readArg("password") ?? process.env.ADMIN_PASSWORD ?? "";

if (!email || !email.includes("@")) {
  console.error("Provide an admin email with --email or ADMIN_EMAIL.");
  process.exit(1);
}

if (password.length < 10) {
  console.error("Provide an admin password with at least 10 characters using --password or ADMIN_PASSWORD.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
const passwordHash = await hash(password, 12);
const id = `admin_${randomUUID().replaceAll("-", "")}`;

try {
  await client.connect();
  const result = await client.query(
    `
      INSERT INTO users (
        id,
        email,
        "emailVerified",
        "passwordHash",
        role,
        active,
        "authVersion",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        $3,
        $1,
        NOW(),
        $2,
        'SUPER_ADMIN',
        true,
        1,
        NOW(),
        NOW()
      )
      ON CONFLICT (email)
      DO UPDATE SET
        "emailVerified" = COALESCE(users."emailVerified", NOW()),
        "passwordHash" = EXCLUDED."passwordHash",
        role = 'SUPER_ADMIN',
        active = true,
        "authVersion" = users."authVersion" + 1,
        "updatedAt" = NOW()
      RETURNING id, email, role, active, "authVersion";
    `,
    [email, passwordHash, id],
  );

  const admin = result.rows[0];
  console.log(`Admin ready: ${admin.email} (${admin.role}, active=${admin.active}, authVersion=${admin.authVersion})`);
} finally {
  await client.end();
}
