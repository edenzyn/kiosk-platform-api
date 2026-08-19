export interface TwoFactorStatusResponseDto {
  isEnabled: boolean;
}

export interface SetupTwoFactorResponseDto {
  secret: string;
  qrCodeDataUrl: string;
}

export interface EnableTwoFactorRequestDto {
  code: string;
}

export interface EnableTwoFactorResponseDto {
  backupCodes: string[];
}

export interface DisableTwoFactorRequestDto {
  password: string;
}

export interface DisableTwoFactorResponseDto {
  message: string;
}
