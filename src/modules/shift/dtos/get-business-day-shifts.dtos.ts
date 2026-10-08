import type { ManagerVerificationMethodEnum } from "../../../shared/enums/shift/manager-verification-method.enum";
import type { ShiftEndTypeEnum } from "../../../shared/enums/shift/shift-end-type.enum";
import type { ShiftStatusEnum } from "../../../shared/enums/shift/shift-status.enum";
import type { ShiftTotalDto } from "./shift.dtos";

export interface ShiftUserDto {
  id: string;
  name: string;
}

export interface GetBusinessDayShiftsQueryDto {
  businessDayId: string;
}

export interface BusinessDayShiftDto {
  id: string;
  status: ShiftStatusEnum;
  staff: ShiftUserDto;
  deviceName: string;
  startedAt: Date;
  endedAt: Date | null;
  endType: ShiftEndTypeEnum | null;
  endedBy: ShiftUserDto | null;
  note: string | null;
  currencyCode: string | null;
  openingCash: string;
  /** Opening cash plus the cash collected: what the drawer should hold. */
  expectedCash: string;
  /** Cash, QR and card together. */
  collectedAmount: string;
  cash: ShiftTotalDto;
  qr: ShiftTotalDto;
  card: ShiftTotalDto;
  cancelled: ShiftTotalDto;
  startVerifiedBy: ShiftUserDto | null;
  /** Null when the staff member confirmed their own shift. */
  startVerificationMethod: ManagerVerificationMethodEnum | null;
  endVerifiedBy: ShiftUserDto | null;
  endVerificationMethod: ManagerVerificationMethodEnum | null;
}

export interface GetBusinessDayShiftsResponseDto {
  shifts: BusinessDayShiftDto[];
}
