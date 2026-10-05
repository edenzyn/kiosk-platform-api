export interface GetDeviceBusinessDayResponseDto {
  /** Orders are only taken while a business day is open. */
  isOpen: boolean;
  /** The day is open but new orders are on hold. */
  isOrderingPaused: boolean;
  /** The open day's date (YYYY-MM-DD); null while closed. */
  businessDate: string | null;
}
