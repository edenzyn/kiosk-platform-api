/**
 * Single source of truth for verification code sizes and OTP policy.
 *
 * Drives code generation, request validation, rate limiting, and the OTP
 * inputs on the client (sizes mirrored in
 * `user-client/src/shared/constants/otpConstants.ts`).
 */
export const OTP_CONSTANTS = {
  /** Digits in a delivered OTP (2FA email/WhatsApp, email & mobile change). */
  CODE_LENGTH: 6,

  /** How long a delivered OTP stays valid after it is issued. */
  EXPIRY_MINUTES: 5,
  /** Wrong guesses allowed against a single OTP before it is burned. */
  MAX_VERIFY_ATTEMPTS: 5,

  /** Max OTPs a user may generate per type within the window below. */
  MAX_GENERATIONS_PER_WINDOW: 5,
  /** Rolling window used to count a user's OTP generations for a given type. */
  GENERATION_WINDOW_MINUTES: 10,
} as const;
