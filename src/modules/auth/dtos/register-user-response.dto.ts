import type { UserEntity } from "../../user/user.schema";

export interface RegisterUserResponseDto {
  user: Omit<UserEntity, "password">;
}
