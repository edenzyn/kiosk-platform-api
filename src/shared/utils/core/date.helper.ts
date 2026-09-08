import ms, { type StringValue } from "ms";

/**
 * Resolves a Date this many duration units from now (e.g. "7d"). Useful for
 * matching an expiry column to a token signed with the same duration string.
 */
export function resolveExpiryDate(duration: string): Date {
  return new Date(Date.now() + ms(duration as StringValue));
}
