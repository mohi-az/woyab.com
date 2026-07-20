import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  API_VERSION: z.string().min(1).default("v1"),
  APP_NAME: z.string().min(1).default("Fargo API"),
  CORS_ORIGIN: z.string().min(1).default("*"),
  DATABASE_URL: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  MAPBOX_PUBLIC_TOKEN: z.string().min(1).optional(),
  NOMINATIM_REVERSE_URL: z.string().url().default("https://nominatim.openstreetmap.org/reverse"),
  NOMINATIM_USER_AGENT: z.string().min(8).default("Fargo/1.0 (https://fargo.local)"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  GOOGLE_PLACES_API_KEY: z.string().min(1).optional(),
  INTERNAL_API_SECRET: z.string().min(32).optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration", z.treeifyError(parsedEnv.error));
  process.exit(1);
}

export const env = {
  ...parsedEnv.data,
  DATABASE_URL:
    parsedEnv.data.DATABASE_URL ??
    (parsedEnv.data.NODE_ENV === "development"
      ? "postgresql://localhost:5432/postgres"
      : undefined),
};

if (!env.DATABASE_URL) {
  console.error("Invalid environment configuration", {
    DATABASE_URL: "DATABASE_URL is required outside development",
  });
  process.exit(1);
}

if (env.NODE_ENV === "production" && env.GOOGLE_PLACES_API_KEY && !env.INTERNAL_API_SECRET) {
  console.error("Invalid environment configuration", {
    INTERNAL_API_SECRET: "A secret of at least 32 characters is required when Google Places is enabled",
  });
  process.exit(1);
}

export const corsOrigins =
  env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
