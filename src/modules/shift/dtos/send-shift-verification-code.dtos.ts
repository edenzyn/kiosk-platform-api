export interface SendShiftVerificationCodeBodyDto {
  managerId: string;
}

export interface SendShiftVerificationCodeResponseDto {
  verificationId: string;
  /** Masked email and mobile number the code went to. */
  sentTo: string[];
}
