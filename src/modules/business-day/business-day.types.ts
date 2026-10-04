import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { BusinessDayActionEnum } from "../../shared/enums/business-day/business-day-action.enum";
import type { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import type { BusinessDayDto } from "./dtos/business-day.dtos";
import type { GetBusinessDayLogsResponseDto } from "./dtos/get-business-day-logs.dtos";
import type {
  GetBusinessDaysQueryDto,
  GetBusinessDaysResponseDto,
} from "./dtos/get-business-days.dtos";
import type { GetCurrentBusinessDayResponseDto } from "./dtos/get-current-business-day.dtos";
import type { GetDeviceBusinessDayResponseDto } from "./dtos/get-device-business-day.dtos";
import type { OpenBusinessDayBodyDto } from "./dtos/open-business-day.dtos";
import type { BusinessDayEntity } from "./schemas/business-day.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface GetCurrentBusinessDayServiceInput {
  effectiveTenant: EffectiveTenant;
}
export type GetCurrentBusinessDayServiceResult =
  GetCurrentBusinessDayResponseDto;

export interface OpenBusinessDayServiceInput {
  effectiveTenant: EffectiveTenant;
  user: UserTokenDto;
  dto: OpenBusinessDayBodyDto;
}
export type OpenBusinessDayServiceResult = GetCurrentBusinessDayResponseDto;

export interface CloseBusinessDayServiceInput {
  effectiveTenant: EffectiveTenant;
  user: UserTokenDto;
}
export type CloseBusinessDayServiceResult = GetCurrentBusinessDayResponseDto;

export interface GetBusinessDaysServiceInput {
  effectiveTenant: EffectiveTenant;
  filters: GetBusinessDaysQueryDto;
}
export type GetBusinessDaysServiceResult = GetBusinessDaysResponseDto;

export interface GetBusinessDayLogsServiceInput {
  effectiveTenant: EffectiveTenant;
  businessDayId: string;
}
export type GetBusinessDayLogsServiceResult = GetBusinessDayLogsResponseDto;

export interface GetDeviceBusinessDayServiceInput {
  device: DeviceTokenDto;
}
export type GetDeviceBusinessDayServiceResult = GetDeviceBusinessDayResponseDto;

export interface GetOpenBusinessDayIdServiceInput {
  branchId: string;
}

export interface FindCurrentBusinessDayIdServiceInput {
  branchId: string;
}

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
export interface FindOpenBusinessDayRepoInput {
  branchId: string;
}
export type FindOpenBusinessDayRepoResult = BusinessDayEntity | null;

export interface FindBusinessDayByDateRepoInput {
  branchId: string;
  businessDate: string;
}
export type FindBusinessDayByDateRepoResult = BusinessDayEntity | null;

export interface FindBusinessDaySummaryRepoInput {
  id: string;
}
export type FindBusinessDaySummaryRepoResult = BusinessDayDto | null;

export interface FindOneBusinessDayRepoInput {
  id: string;
  organizationId: string;
  branchId: string;
}
export type FindOneBusinessDayRepoResult = BusinessDayEntity | null;

export interface OpenBusinessDayRepoInput {
  organizationId: string;
  branchId: string;
  businessDate: string;
  performedBy: string;
  /** A day still open from an earlier date, closed in the same transaction. */
  closeDayId: string | null;
}
export interface OpenBusinessDayRepoResult {
  day: BusinessDayEntity;
  action: BusinessDayActionEnum.OPENED | BusinessDayActionEnum.REOPENED;
}

export interface CloseBusinessDayRepoInput {
  id: string;
  performedBy: string;
}
/** Null when the day was not open. */
export type CloseBusinessDayRepoResult = BusinessDayEntity | null;

export interface FindBusinessDaysRepoInput {
  organizationId: string;
  branchId: string;
  page: number;
  limit: number;
  fromDate?: string;
  toDate?: string;
  sortOrder?: SortingOrderEnum;
}
export interface FindBusinessDaysRepoResult {
  businessDays: BusinessDayDto[];
  total: number;
}

export interface FindBusinessDayLogsRepoInput {
  businessDayId: string;
}
export type FindBusinessDayLogsRepoResult =
  GetBusinessDayLogsResponseDto["logs"];
