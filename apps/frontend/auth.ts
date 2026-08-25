import "server-only";

import { compare } from "bcryptjs";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { credentialsSchema } from "@woyab/shared";
import { prisma } from "@/lib/prisma";
import { decryptTwoFactorSecret, verifyTotp } from "@/lib/two-factor";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";
import { requestIp } from "@/lib/rate-limit";

const providers: NextAuthConfig["providers"] = [
  // Standard credentials provider (email + password, no 2FA code required here)
  Credentials({
    id: "credentials",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      totpCode: { label: "Administrator verification code", type: "text" },
    },
    authorize: async (credentials, request) => {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;
      const email = parsed.data.email.trim().toLowerCase();
      const limited = await Promise.all([
        isPersistentlyRateLimited("login-ip", requestIp(request), 30, 15 * 60_000),
        isPersistentlyRateLimited("login-email", email, 15, 15 * 60_000),
      ]);
      if (limited.some(Boolean)) return null;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash || !user.active || !user.emailVerified) return null;
      if (!(await compare(parsed.data.password, user.passwordHash))) return null;

      const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

      // If 2FA is enabled, deny direct login — must go through challenge → verify flow.
      // Exception: admins may still pass totpCode directly (backward-compatible legacy path).
      if (user.twoFactorEnabledAt) {
        if (isAdmin) {
          const code = typeof credentials.totpCode === "string" ? credentials.totpCode.trim() : "";
          if (code && user.twoFactorSecretEncrypted && verifyTotp(decryptTwoFactorSecret(user.twoFactorSecretEncrypted), code)) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.avatarUrl,
              role: user.role,
              authVersion: user.authVersion,
              twoFactorVerified: true,
            };
          }
        }
        // All users with 2FA must use the new challenge flow
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.avatarUrl,
        role: user.role,
        authVersion: user.authVersion,
        twoFactorVerified: true,
      };
    },
  }),

  // Used after the user successfully verifies their TOTP code via /api/auth/two-factor/verify.
  // The verify API validates the challenge cookie and TOTP before calling signIn with this provider.
  Credentials({
    id: "two-factor-verified",
    name: "Two-factor verified",
    credentials: {
      userId: { label: "User ID", type: "text" },
      internalSecret: { label: "Internal secret", type: "text" },
    },
    authorize: async (credentials) => {
      const userId = typeof credentials?.userId === "string" ? credentials.userId.trim() : "";
      const internalSecret = typeof credentials?.internalSecret === "string" ? credentials.internalSecret : "";

      const expectedSecret = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.AUTH_SECRET || "woyab-default-dev-secret-key-for-2fa";
      if (!internalSecret || !expectedSecret || internalSecret !== expectedSecret) return null;
      if (!userId) return null;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          authVersion: true,
          active: true,
          twoFactorEnabledAt: true,
        },
      });

      if (!user?.active || !user.twoFactorEnabledAt) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.avatarUrl,
        role: user.role,
        authVersion: user.authVersion,
        twoFactorVerified: true,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "development" ? "woyab-local-development-secret-change-me" : undefined),
  providers,
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  callbacks: {
    signIn: async ({ account, profile }) => {
      if (account?.provider !== "google") return true;
      if (!profile) return false;
      const email = profile.email?.trim().toLowerCase();
      if (!email || profile.email_verified !== true) return false;

      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { avatarUrl: true, active: true },
      });
      if (existingUser && !existingUser.active) return false;
      const googleAvatar = typeof profile.picture === "string" ? profile.picture : undefined;
      const avatarUrl = existingUser?.avatarUrl?.startsWith("/uploads/avatars/")
        ? undefined
        : googleAvatar;

      if (existingUser) {
        await prisma.user.update({
          where: { email },
          data: {
            emailVerified: new Date(),
            name: profile.name ?? undefined,
            avatarUrl,
          },
        });
      } else {
        await prisma.user.create({
          data: {
            email,
            emailVerified: new Date(),
            name: profile.name,
            avatarUrl: googleAvatar,
          },
        });
      }
      return true;
    },
    jwt: async ({ token, user }) => {
      const databaseUser = user?.email
        ? await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } })
        : token.sub
          ? await prisma.user.findUnique({ where: { id: token.sub } })
          : null;

      if (!databaseUser?.active) {
        token.invalid = true;
        return token;
      }

      if (token.authVersion !== undefined && token.authVersion !== databaseUser.authVersion) {
        token.invalid = true;
        return token;
      }

      token.sub = databaseUser.id;
      token.role = databaseUser.role;
      token.authVersion = databaseUser.authVersion;
      if (user) token.twoFactorVerified = Boolean(user.twoFactorVerified);
      token.invalid = false;
      token.name = databaseUser.name;
      token.picture = databaseUser.avatarUrl;
      return token;
    },
    session: ({ session, token }) => {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role ?? "USER";
        session.user.invalid = token.invalid;
        session.user.twoFactorVerified = token.twoFactorVerified;
      }
      return session;
    },
  },
});
