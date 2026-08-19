import type { TwoFactorMethodEnums } from "../../../shared/enums/user/two-factor-method.enum";

export interface TwoFactorStatusResponseDto {
  isEnabled: boolean;
  method: TwoFactorMethodEnums | null;
}

export interface SetupTwoFactorRequestDto {
  method: TwoFactorMethodEnums;
}

export interface SetupTwoFactorResponseDto {
  otpToken: string;
  method: TwoFactorMethodEnums;
  qrCodeDataUrl?: string;
  manualEntryCode?: string;
}

export interface EnableTwoFactorRequestDto {
  otpToken: string;
  code: string;
}

export interface EnableTwoFactorResponseDto {
  message: string;
  method: TwoFactorMethodEnums;
  backupCodes?: string[];
}

export interface DisableTwoFactorRequestDto {
  password: string;
}

export interface DisableTwoFactorResponseDto {
  message: string;
}

export interface VerifyTwoFactorLoginRequestDto {
  twoFactorToken: string;
  code: string;
}
