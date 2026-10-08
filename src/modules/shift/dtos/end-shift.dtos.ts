import type { ShiftSummaryDto } from "./shift.dtos";
import type { ShiftVerificationBodyDto } from "./shift-verification.dtos";

export interface EndShiftBodyDto {
  note?: string | null;
  verification?: ShiftVerificationBodyDto;
}

export interface EndShiftResponseDto {
  summary: ShiftSummaryDto;
}
