export interface SendOtpOptions {
  mobile: string;
}

export interface ResendOtpOptions {
  mobile: string;
  retryType?: "text" | "voice";
}

export interface VerifyOtpOptions {
  mobile: string;
  otp: string;
}

export interface Msg91OtpResponse {
  type: "success" | "error";
  message?: string;
}
