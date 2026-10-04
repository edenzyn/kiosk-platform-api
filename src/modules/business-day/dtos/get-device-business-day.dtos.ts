export interface GetDeviceBusinessDayResponseDto {
  /** Orders are only taken while a business day is open. */
  isOpen: boolean;
  /** The open day's date (YYYY-MM-DD); null while closed. */
  businessDate: string | null;
}
