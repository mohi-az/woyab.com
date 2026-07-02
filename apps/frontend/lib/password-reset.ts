import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const passwordResetTokenMaxAgeMs = 30 * 60 * 1000;

export function createPasswordResetToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPasswordResetToken(token) };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function passwordResetExpiry() {
  return new Date(Date.now() + passwordResetTokenMaxAgeMs);
}
