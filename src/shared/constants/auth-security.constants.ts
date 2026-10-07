import { DeviceTypeEnum } from "../enums/device/device-type.enum";
import { UserPermissions } from "../enums/rbac/user-permission.enum";

export const ONE_TIME_TOKEN_CONSTANTS = {
  /** Digits in a delivered OTP (2FA email/WhatsApp, email & mobile change). */
  CODE_LENGTH: 6,

  /** How long a delivered code stays valid after it is issued. */
  EXPIRY_MINUTES: 5,
  /** Wrong guesses allowed against a single token before it is burned. */
  MAX_VERIFY_ATTEMPTS: 5,

  /** Max tokens a user may generate per type within the window below. */
  MAX_GENERATIONS_PER_WINDOW: 5,
  /** Rolling window used to count a user's token generations for a given type. */
  GENERATION_WINDOW_MINUTES: 10,

  RESET_TOKEN_LENGTH: 32,
  /** How long a password-reset link stays valid. */
  RESET_TOKEN_EXPIRY_MINUTES: 5,
} as const;

export const DEVICE_ADMIN_CONSTANTS = {
  SESSION_EXPIRES_IN: "5m",

  /** Wrong sign-in attempts allowed for one person on one device; staff sign-in uses the same limit. */
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_LOCK_SECONDS: 5 * 60, // 5 minutes
} as const;

export const DEVICE_STAFF_CONSTANTS = {
  ACCESS_EXPIRES_IN_SECONDS: 15 * 60, // 15 minutes
  SESSION_MAX_AGE_SECONDS: 12 * 60 * 60, // 12 hours

  /** The branch permission a staff member needs to sign in on each staff-facing device type. */
  PERMISSIONS: {
    [DeviceTypeEnum.COUNTER]: UserPermissions.BRANCH_DEVICE_STAFF_COUNTER,
  } as Partial<Record<DeviceTypeEnum, UserPermissions>>,
} as const;
