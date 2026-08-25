import type { UserEntity } from "../schemas/user.schema";

export interface UpdateProfileRequestDto {
  name: string;
}
export type UpdateProfileResponseDto = Omit<UserEntity, "password">;

export interface RequestEmailChangeRequestDto {
  newEmail: string;
}
export interface RequestMobileChangeRequestDto {
  newMobile: string;
}
export interface RequestContactChangeResponseDto {
  verificationId: string;
}

export interface ConfirmContactChangeRequestDto {
  verificationId: string;
  code: string;
}
export interface ConfirmContactChangeResponseDto {
  message: string;
  user: Omit<UserEntity, "password">;
}
