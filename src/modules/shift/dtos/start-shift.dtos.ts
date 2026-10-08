import type { ShiftVerificationBodyDto } from "./shift-verification.dtos";

export interface StartShiftBodyDto {
  openingCash: number;
  verification?: ShiftVerificationBodyDto;
}
