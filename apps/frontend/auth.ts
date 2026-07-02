import "server-only";

import { compare } from "bcryptjs";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { credentialsSchema } from "@fargo/shared";
import { prisma } from "@/lib/prisma";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (!user?.passwordHash || !user.active) return null;
      if (!(await compare(parsed.data.password, user.passwordHash))) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.avatarUrl,
        role: user.role,
        authVersion: user.authVersion,
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
  secret: process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "development" ? "fargo-local-development-secret-change-me" : undefined),
  providers,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  callbacks: {
    signIn: async ({ account, profile }) => {
      if (account?.provider !== "google") return true;
      if (!profile) return false;
      const email = profile.email?.trim().toLowerCase();
      if (!email || profile.email_verified !== true) return false;

      const existingUser = await prisma.user.findUnique({ where: { email }, select: { avatarUrl: true } });
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
      }
      return session;
    },
  },
});
