import {
  fromMinorUnits,
  toMinorUnits,
} from "../../shared/utils/finance/currency.helper";
import type { UserEntity } from "../user/schemas/user.schema";
import type { BusinessDayShiftDto } from "./dtos/get-business-day-shifts.dtos";
import type { DeviceShiftDto, ShiftSummaryDto } from "./dtos/shift.dtos";
import type { StaffShiftEntity } from "./schemas/staff-shift.schema";
import type {
  BusinessDayShiftRow,
  GetShiftTotalsRepoResult,
} from "./shift.types";

export class ShiftMapper {
  static toDeviceShift(
    shift: StaffShiftEntity,
    staff: Pick<UserEntity, "id" | "name">,
  ): DeviceShiftDto {
    return {
      id: shift.id,
      staff: { id: staff.id, name: staff.name },
      startedAt: shift.startedAt,
      currencyCode: shift.currencyCode,
      openingCash: shift.openingCash,
    };
  }

  static toShiftSummary(
    shift: StaffShiftEntity,
    totals: GetShiftTotalsRepoResult,
  ): ShiftSummaryDto {
    const openingCash = shift.openingCash ?? "0";
    const expectedCash = shift.currencyCode
      ? fromMinorUnits(
          toMinorUnits(openingCash, shift.currencyCode) +
            toMinorUnits(totals.cash.amount, shift.currencyCode),
          shift.currencyCode,
        )
      : openingCash;

    return {
      shiftId: shift.id,
      startedAt: shift.startedAt,
      endedAt: shift.endedAt,
      currencyCode: shift.currencyCode,
      openingCash,
      ...totals,
      expectedCash,
    };
  }

  static toBusinessDayShift(
    row: BusinessDayShiftRow,
    totals: GetShiftTotalsRepoResult,
  ): BusinessDayShiftDto {
    const { shift } = row;
    const summary = ShiftMapper.toShiftSummary(shift, totals);
    const collectedAmount = shift.currencyCode
      ? fromMinorUnits(
          toMinorUnits(totals.cash.amount, shift.currencyCode) +
            toMinorUnits(totals.qr.amount, shift.currencyCode) +
            toMinorUnits(totals.card.amount, shift.currencyCode),
          shift.currencyCode,
        )
      : totals.cash.amount;

    return {
      id: shift.id,
      status: shift.status,
      staff: { id: shift.userId, name: row.staffName },
      deviceName: row.deviceName,
      startedAt: shift.startedAt,
      endedAt: shift.endedAt,
      endType: shift.endType,
      endedBy: row.endedBy,
      note: shift.note,
      currencyCode: shift.currencyCode,
      openingCash: summary.openingCash,
      expectedCash: summary.expectedCash,
      collectedAmount,
      ...totals,
      startVerifiedBy: row.startVerifiedBy,
      startVerificationMethod: shift.startVerificationMethod,
      endVerifiedBy: row.endVerifiedBy,
      endVerificationMethod: shift.endVerificationMethod,
    };
  }

  /** The totals saved on a closed shift, in the same shape as the live ones. */
  static toSavedTotals(shift: StaffShiftEntity): GetShiftTotalsRepoResult {
    return {
      cash: {
        orderCount: shift.cashOrderCount ?? 0,
        amount: shift.cashAmount ?? "0",
      },
      qr: {
        orderCount: shift.qrOrderCount ?? 0,
        amount: shift.qrAmount ?? "0",
      },
      card: {
        orderCount: shift.cardOrderCount ?? 0,
        amount: shift.cardAmount ?? "0",
      },
      cancelled: {
        orderCount: shift.cancelledOrderCount ?? 0,
        amount: shift.cancelledAmount ?? "0",
      },
    };
  }
}
