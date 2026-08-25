import type { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";

/** Exactly one of `email` / `mobile` is supplied. */
export interface ForgotPasswordRequestDto {
  email?: string;
  mobile?: string;
}
export interface ForgotPasswordResponseDto {
  message: string;
}

export interface ResetPasswordRequestDto {
  token: string;
  newPassword: string;
}
export interface ResetPasswordResponseDto {
  message: string;
  /** Lets the client route to the right portal's login screen. */
  userType: UserTypeEnums;
}
