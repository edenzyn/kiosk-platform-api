export interface DeviceShiftDto {
  id: string;
  staff: { id: string; name: string };
  startedAt: Date;
  currencyCode: string | null;
  openingCash: string | null;
}

export interface ShiftTotalDto {
  orderCount: number;
  amount: string;
}

export interface ShiftSummaryDto {
  shiftId: string;
  startedAt: Date;
  endedAt: Date | null;
  currencyCode: string | null;
  openingCash: string;
  cash: ShiftTotalDto;
  qr: ShiftTotalDto;
  card: ShiftTotalDto;
  cancelled: ShiftTotalDto;
  /** Opening cash plus the cash collected: what the drawer should hold. */
  expectedCash: string;
}
