import "dotenv/config";
import * as Yup from "yup";

const EnvSchema = Yup.object({
  NODE_ENV: Yup.string()
    .oneOf(["development", "test", "production"])
    .default("development"),
  PORT: Yup.number().integer().positive().max(65535).default(3000),
  DATABASE_URL: Yup.string().required().min(1),
  DATABASE_SSL_MODE: Yup.string()
    .oneOf(["disable", "require", "verify-full"])
    .default("disable"),
  JWT_ACCESS_SECRET: Yup.string().required().min(6),
  JWT_REFRESH_SECRET: Yup.string().required().min(32),
  JWT_ACCESS_EXPIRES_IN: Yup.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Yup.string().default("7d"),
  BCRYPT_ROUNDS: Yup.number().integer().min(10).max(15).default(12),
  API_PREFIX_V1: Yup.string().default("/api/v1"),
  CORS_ORIGIN_1: Yup.string().required().min(1),
  CORS_ORIGIN_2: Yup.string(),
  RATE_LIMIT_WINDOW_MINUTES: Yup.number().integer().positive().default(1),
  RATE_LIMIT_MAX_REQUESTS: Yup.number().integer().positive().default(100),
});

export const env = EnvSchema.validateSync(process.env, { stripUnknown: true });
