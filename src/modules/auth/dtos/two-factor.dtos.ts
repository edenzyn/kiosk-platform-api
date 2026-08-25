import type { TwoFactorMethodEnums } from "../../../shared/enums/user/two-factor-method.enum";

export interface TwoFactorStatusResponseDto {
  isEnabled: boolean;
  method: TwoFactorMethodEnums | null;
}

export interface SetupTwoFactorRequestDto {
  method: TwoFactorMethodEnums;
}

export interface SetupTwoFactorResponseDto {
  verificationId: string;
  method: TwoFactorMethodEnums;
}

export interface EnableTwoFactorRequestDto {
  verificationId: string;
  code: string;
}

export interface EnableTwoFactorResponseDto {
  message: string;
  method: TwoFactorMethodEnums;
}

export interface DisableTwoFactorRequestDto {
  password: string;
}

export interface DisableTwoFactorResponseDto {
  message: string;
}

export interface VerifyTwoFactorLoginRequestDto {
  verificationId: string;
  code: string;
}
