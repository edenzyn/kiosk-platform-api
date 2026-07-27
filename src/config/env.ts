import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL_MODE: z
    .enum(["disable", "require", "verify-full"])
    .default("disable"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  API_PREFIX_V1: z.string().default("/api/v1"),
  CORS_ORIGIN_1: z.string().min(1),
  CORS_ORIGIN_2: z.string().optional(),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(1),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
});

export const env = EnvSchema.parse(process.env);
