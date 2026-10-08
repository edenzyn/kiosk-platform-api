import type { DeviceStaffTokenDto } from "../../shared/dtos/device-staff-token.dto";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { ManagerVerificationMethodEnum } from "../../shared/enums/shift/manager-verification-method.enum";
import type { ShiftEndTypeEnum } from "../../shared/enums/shift/shift-end-type.enum";
import type {
  EndShiftBodyDto,
  EndShiftResponseDto,
} from "./dtos/end-shift.dtos";
import type {
  ForceCloseShiftBodyDto,
  ForceCloseShiftResponseDto,
} from "./dtos/force-close-shift.dtos";
import type {
  GetBusinessDayShiftsResponseDto,
  ShiftUserDto,
} from "./dtos/get-business-day-shifts.dtos";
import type { GetCurrentShiftResponseDto } from "./dtos/get-current-shift.dtos";
import type {
  GetShiftManagersQueryDto,
  GetShiftManagersResponseDto,
  ShiftManagerDto,
} from "./dtos/get-shift-managers.dtos";
import type {
  SendShiftVerificationCodeBodyDto,
  SendShiftVerificationCodeResponseDto,
} from "./dtos/send-shift-verification-code.dtos";
import type { ShiftVerificationBodyDto } from "./dtos/shift-verification.dtos";
import type { ShiftSummaryDto, ShiftTotalDto } from "./dtos/shift.dtos";
import type { StartShiftBodyDto } from "./dtos/start-shift.dtos";
import type {
  CreateStaffShiftEntity,
  StaffShiftEntity,
} from "./schemas/staff-shift.schema";

// ========================================
// ? SERVICE INPUTS & RESULTS
// ========================================
export interface GetCurrentShiftServiceInput {
  device: DeviceTokenDto;
  staff: DeviceStaffTokenDto;
}
export type GetCurrentShiftServiceResult = GetCurrentShiftResponseDto;

export interface GetShiftManagersServiceInput {
  device: DeviceTokenDto;
  staff: DeviceStaffTokenDto;
  filters: GetShiftManagersQueryDto;
}
export type GetShiftManagersServiceResult = GetShiftManagersResponseDto;

export interface SendShiftVerificationCodeServiceInput {
  device: DeviceTokenDto;
  staff: DeviceStaffTokenDto;
  dto: SendShiftVerificationCodeBodyDto;
}
export type SendShiftVerificationCodeServiceResult =
  SendShiftVerificationCodeResponseDto;

export interface StartShiftServiceInput {
  device: DeviceTokenDto;
  staff: DeviceStaffTokenDto;
  dto: StartShiftBodyDto;
}
export type StartShiftServiceResult = GetCurrentShiftResponseDto;

export interface GetShiftSummaryServiceInput {
  device: DeviceTokenDto;
  staff: DeviceStaffTokenDto;
}
export type GetShiftSummaryServiceResult = ShiftSummaryDto;

export interface EndShiftServiceInput {
  device: DeviceTokenDto;
  staff: DeviceStaffTokenDto;
  dto: EndShiftBodyDto;
}
export type EndShiftServiceResult = EndShiftResponseDto;

export interface GetBusinessDayShiftsServiceInput {
  effectiveTenant: EffectiveTenant;
  businessDayId: string;
}
export type GetBusinessDayShiftsServiceResult = GetBusinessDayShiftsResponseDto;

export interface ForceCloseShiftServiceInput {
  effectiveTenant: EffectiveTenant;
  user: UserTokenDto;
  shiftId: string;
  dto: ForceCloseShiftBodyDto;
}
export type ForceCloseShiftServiceResult = ForceCloseShiftResponseDto;

export interface GetActiveShiftIdServiceInput {
  device: DeviceTokenDto;
  staff?: DeviceStaffTokenDto;
}

export interface FindShiftManagerServiceInput {
  device: DeviceTokenDto;
  staff: DeviceStaffTokenDto;
  managerId: string;
}

export interface VerifyShiftServiceInput {
  device: DeviceTokenDto;
  staff: DeviceStaffTokenDto;
  verification?: ShiftVerificationBodyDto;
}
export interface VerifyShiftServiceResult {
  verifiedBy: string;
  /** Null when the staff member confirmed their own shift. */
  verificationMethod: ManagerVerificationMethodEnum | null;
}

// ========================================
// ? REPOSITORY INPUTS & RESULTS
// ========================================
/** Give the device or the staff member; an open shift is unique for both. */
export interface FindOpenShiftRepoInput {
  deviceId?: string;
  userId?: string;
}
export type FindOpenShiftRepoResult = StaffShiftEntity | null;

export interface FindShiftRepoInput {
  id: string;
  organizationId: string;
  branchId?: string;
}
export type FindShiftRepoResult = StaffShiftEntity | null;

export interface FindBusinessDayShiftsRepoInput {
  businessDayId: string;
  organizationId: string;
  branchId?: string;
}
export interface BusinessDayShiftRow {
  shift: StaffShiftEntity;
  staffName: string;
  deviceName: string;
  endedBy: ShiftUserDto | null;
  startVerifiedBy: ShiftUserDto | null;
  endVerifiedBy: ShiftUserDto | null;
}
export type FindBusinessDayShiftsRepoResult = BusinessDayShiftRow[];

export type CreateShiftRepoInput = CreateStaffShiftEntity;
export type CreateShiftRepoResult = StaffShiftEntity;

export interface GetShiftTotalsRepoInput {
  shiftId: string;
}
export interface GetShiftTotalsRepoResult {
  cash: ShiftTotalDto;
  qr: ShiftTotalDto;
  card: ShiftTotalDto;
  cancelled: ShiftTotalDto;
}

export interface CloseShiftRepoInput {
  id: string;
  endType: ShiftEndTypeEnum;
  endedBy: string;
  note?: string | null;
  endVerifiedBy?: string | null;
  endVerificationMethod?: ManagerVerificationMethodEnum | null;
}
/** Null when the shift was not open. */
export type CloseShiftRepoResult = StaffShiftEntity | null;

export interface CloseBusinessDayShiftsRepoInput {
  businessDayId: string;
  endedBy: string;
  note: string;
}
/** How many shifts were closed. */
export type CloseBusinessDayShiftsRepoResult = number;

export interface FindShiftManagersRepoInput {
  organizationId: string;
  branchId: string;
  /** The staff member starting or ending the shift; they cannot verify it themselves. */
  excludeUserId: string;
  search?: string;
  page: number;
  limit: number;
}
export interface FindShiftManagersRepoResult {
  managers: ShiftManagerDto[];
  total: number;
}
