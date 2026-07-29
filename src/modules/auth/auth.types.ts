import type { UserEntity } from "../user/user.schema";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: Omit<UserEntity, "password">;
  tokens: AuthTokens;
}

export interface LoginUserResponseDto {
  user: Omit<UserEntity, "password">;
}

export interface RegisterUserResponseDto {
  user: Omit<UserEntity, "password">;
}

export interface LoginUserRequestDto {
  email: string;
  password: string;
}

export interface RegisterUserRequestDto extends LoginUserRequestDto {
  name: string;
}
