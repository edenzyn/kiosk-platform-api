import type { BusinessDayDto } from "./business-day.dtos";

export interface GetCurrentBusinessDayResponseDto {
  /** Today at the branch (YYYY-MM-DD). */
  businessDate: string;
  timezone: string;
  /**
   * The open day, which may be from an earlier date if nobody closed it;
   * otherwise today's day once it has been closed; null before today is opened.
   */
  day: BusinessDayDto | null;
}
