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
  JWT_INVITE_USER_SECRET: Yup.string().default("invite_secret_key_default"),
  JWT_ACCESS_EXPIRES_IN: Yup.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Yup.string().default("7d"),
  JWT_DEVICE_ACCESS_EXPIRES_IN: Yup.string().default("15m"),
  JWT_DEVICE_REFRESH_EXPIRES_IN: Yup.string().default("90d"),
  JWT_INVITE_USER_EXPIRES_IN: Yup.string().default("7d"),
  JWT_REFRESH_SLIDING_ENABLED: Yup.boolean().default(true),
  BCRYPT_ROUNDS: Yup.number().integer().min(10).max(15).default(12),
  API_PREFIX_V1: Yup.string().default("/api/v1"),
  CORS_ORIGIN_1: Yup.string().required().min(1),
  CORS_ORIGIN_2: Yup.string(),
  USER_CLIENT_BASE_URL: Yup.string().default("http://localhost:5000"),
  RATE_LIMIT_WINDOW_MINUTES: Yup.number().integer().positive().default(1),
  RATE_LIMIT_MAX_REQUESTS: Yup.number().integer().positive().default(100),
  SMTP_HOST: Yup.string().default("smtp.gmail.com"),
  SMTP_PORT: Yup.number().integer().positive().default(465),
  SMTP_USER: Yup.string().default(""),
  SMTP_PASS: Yup.string().default(""),
  SMTP_FROM: Yup.string().default(
    '"Kiosk Platform" <noreply@kioskplatform.com>',
  ),
});

export const env = EnvSchema.validateSync(process.env, { stripUnknown: true });
