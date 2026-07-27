import type { UserEntity } from "../user/user.schema";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginUserResponseDto {
  user: Omit<UserEntity, "password">;
  tokens: AuthTokens;
}

export interface RegisterUserResponseDto {
  user: Omit<UserEntity, "password">;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}
