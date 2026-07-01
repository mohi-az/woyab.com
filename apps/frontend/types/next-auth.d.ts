import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "OWNER" | "ADMIN" | "SUPER_ADMIN";
      invalid?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "USER" | "OWNER" | "ADMIN" | "SUPER_ADMIN";
    authVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "USER" | "OWNER" | "ADMIN" | "SUPER_ADMIN";
    authVersion?: number;
    invalid?: boolean;
  }
}
