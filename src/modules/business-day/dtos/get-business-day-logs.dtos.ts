import type { BusinessDayActionEnum } from "../../../shared/enums/business-day/business-day-action.enum";
import type { BusinessDayUserDto } from "./business-day.dtos";

export interface BusinessDayLogDto {
  id: string;
  action: BusinessDayActionEnum;
  performedBy: BusinessDayUserDto;
  createdAt: Date;
}

export interface GetBusinessDayLogsResponseDto {
  logs: BusinessDayLogDto[];
}
