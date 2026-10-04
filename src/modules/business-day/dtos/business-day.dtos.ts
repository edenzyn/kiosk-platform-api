import type { BusinessDayStatusEnum } from "../../../shared/enums/business-day/business-day-status.enum";

export interface BusinessDayUserDto {
  id: string;
  name: string;
}

export interface BusinessDayDto {
  id: string;
  /** YYYY-MM-DD in the branch time zone: the date the manager opened it on. */
  businessDate: string;
  status: BusinessDayStatusEnum;
  openedAt: Date;
  openedBy: BusinessDayUserDto;
  closedAt: Date | null;
  /** Null while the day is open. */
  closedBy: BusinessDayUserDto | null;
}
