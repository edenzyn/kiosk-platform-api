import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import ms, { type StringValue } from "ms";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Resolves a Date this many duration units from now (e.g. "7d"). Useful for
 * matching an expiry column to a token signed with the same duration string.
 */
export function resolveExpiryDate(duration: string): Date {
  return new Date(Date.now() + ms(duration as StringValue));
}

/** Formats a date as seen in the given IANA time zone, e.g. "YYMMDD" → "260930". */
export function formatDateInTimezone(
  date: Date,
  timezoneName: string,
  format: string,
): string {
  return dayjs(date).tz(timezoneName).format(format);
}
