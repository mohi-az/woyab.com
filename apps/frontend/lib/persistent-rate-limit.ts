import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

function identifierHash(action: string, identifier: string) {
  const secret = process.env.ABUSE_RATE_LIMIT_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("ABUSE_RATE_LIMIT_SECRET is not configured.");
  return createHmac("sha256", secret)
    .update(`${action}:${identifier.trim().toLowerCase()}`)
    .digest("hex");
}

export async function isPersistentlyRateLimited(
  action: string,
  identifier: string,
  limit: number,
  windowMs: number,
) {
  const keyHash = identifierHash(action, identifier);
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const expiresAt = new Date(now.getTime() + windowMs);
  const rows = await prisma.$queryRaw<Array<{ hits: number }>>`
    INSERT INTO "security_rate_limits"
      ("id", "action", "keyHash", "hits", "windowStartedAt", "expiresAt", "updatedAt")
    VALUES
      (${randomUUID()}, ${action}, ${keyHash}, 1, ${now}, ${expiresAt}, ${now})
    ON CONFLICT ("action", "keyHash") DO UPDATE SET
      "hits" = CASE
        WHEN "security_rate_limits"."windowStartedAt" <= ${windowStart} THEN 1
        ELSE "security_rate_limits"."hits" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "security_rate_limits"."windowStartedAt" <= ${windowStart} THEN ${now}
        ELSE "security_rate_limits"."windowStartedAt"
      END,
      "expiresAt" = ${expiresAt},
      "updatedAt" = ${now}
    RETURNING "hits"
  `;
  return (rows[0]?.hits ?? limit + 1) > limit;
}
