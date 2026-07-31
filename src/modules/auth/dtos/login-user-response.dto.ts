import type { UserEntity } from "../../user/user.schema";

export interface LoginUserResponseDto {
  user: Omit<UserEntity, "password">;
}
