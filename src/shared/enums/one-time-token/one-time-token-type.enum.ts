/**
 * Purpose a one-time token was issued for. Also the scope key for generation rate
 * limiting — a user's allowance is counted per (userId, type).
 */
export enum OneTimeTokenTypeEnum {
  TWO_FACTOR_SETUP = 1,
  TWO_FACTOR_LOGIN = 2,
  EMAIL_CHANGE = 3,
  MOBILE_CHANGE = 4,
  PASSWORD_RESET = 5,
}
