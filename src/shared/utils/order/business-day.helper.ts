import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Start of the business day `now` falls in, used for token numbering and
 * reports only. It is the latest cutoff (branch time zone) at or before `now`;
 * midnight when no cutoff is set.
 */
export function resolveBusinessDayStart(
  now: Date,
  branchTimezone: string,
  cutoffTime: string | null,
): Date {
  const localNow = dayjs(now).tz(branchTimezone);
  const [hour = 0, minute = 0, second = 0] = (cutoffTime ?? "00:00:00")
    .split(":")
    .map(Number);

  let start = localNow.hour(hour).minute(minute).second(second).millisecond(0);
  if (start.isAfter(localNow)) {
    start = start.subtract(1, "day");
  }

  return start.toDate();
}
