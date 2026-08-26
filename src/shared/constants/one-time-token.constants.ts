/**
 * Single source of truth for one-time token sizes and policy.
 *
 * Drives token generation, request validation, rate limiting, and the OTP
 * inputs on the client (sizes mirrored in
 * `user-client/src/shared/constants/otpConstants.ts`).
 */
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
