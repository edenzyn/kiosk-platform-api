/**
 * Single source of truth for verification code sizes.
 *
 * Drives code generation, request validation, and the OTP inputs on the
 * client (mirrored in `user-client/src/shared/constants/otpConstants.ts`).
 */
export const OTP_CONSTANTS = {
  /** Digits in a delivered OTP (2FA email/WhatsApp, email & mobile change). */
  CODE_LENGTH: 6,
  /** Number of single-use 2FA backup codes issued when enabling authenticator 2FA. */
  BACKUP_CODE_COUNT: 8,
  /** Characters in each alphanumeric 2FA backup code. */
  BACKUP_CODE_LENGTH: 8,
} as const;
