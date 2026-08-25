import "dotenv/config";
import * as Yup from "yup";

const EnvSchema = Yup.object({
  APP_NAME: Yup.string().default("Kiosk Platform"),
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
  JWT_2FA_SECRET: Yup.string().required().min(16),
  JWT_ACCESS_EXPIRES_IN: Yup.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Yup.string().default("7d"),
  JWT_DEVICE_ACCESS_EXPIRES_IN: Yup.string().default("15m"),
  JWT_DEVICE_REFRESH_EXPIRES_IN: Yup.string().default("90d"),
  JWT_INVITE_USER_EXPIRES_IN: Yup.string().default("7d"),
  JWT_2FA_OTP_EXPIRES_IN: Yup.string().default("10m"),
  JWT_2FA_TOTP_SETUP_EXPIRES_IN: Yup.string().default("10m"),
  JWT_2FA_PENDING_LOGIN_EXPIRES_IN: Yup.string().default("5m"),
  JWT_PROFILE_VERIFICATION_SECRET: Yup.string().required().min(16),
  JWT_PROFILE_VERIFICATION_EXPIRES_IN: Yup.string().default("10m"),
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
  META_WHATSAPP_ACCESS_TOKEN: Yup.string().required(),
  META_WHATSAPP_VERIFY_TOKEN: Yup.string().required(),
  META_WHATSAPP_APP_SECRET: Yup.string().required(),
  META_WHATSAPP_PHONE_NUMBER_ID: Yup.string().required(),
  META_WHATSAPP_API_VERSION: Yup.string().required(),
  META_WHATSAPP_API_BASE_URL: Yup.string().default(
    "https://graph.facebook.com",
  ),
  NORMAL_USER_SESSION_LIMIT: Yup.number().integer().positive().default(5),
  RESELLER_USER_SESSION_LIMIT: Yup.number().integer().positive().default(5),
  PLATFORM_USER_SESSION_LIMIT: Yup.number().integer().positive().default(5),
  IS_NORMAL_SESSION_AUTO_LOGOUT_ENABLED: Yup.boolean().default(true),
  IS_RESELLER_SESSION_AUTO_LOGOUT_ENABLED: Yup.boolean().default(true),
  IS_PLATFORM_SESSION_AUTO_LOGOUT_ENABLED: Yup.boolean().default(true),
  REDIS_URL: Yup.string().default("redis://localhost:6379"),
  LICENSE_ENCRYPTION_KEY: Yup.string()
    .required()
    .test(
      "valid-aes-key",
      "LICENSE_ENCRYPTION_KEY must be a Base64-encoded 32-byte key",
      (value) => {
        if (!value) return false;

        try {
          return Buffer.from(value, "base64").length === 32;
        } catch {
          return false;
        }
      },
    ),
  LICENSE_GRACE_PERIOD_DAYS: Yup.number().integer().min(0).default(7),
  AUTH_SESSION_CLEANUP_CRON: Yup.string().default("0 4 * * *"),
  LICENSE_STATUS_CHECK_CRON: Yup.string().default("0 */6 * * *"),
});

export const env = EnvSchema.validateSync(process.env, { stripUnknown: true });
