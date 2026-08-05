import type { UserEntity } from "../../user/schemas/user.schema";

export interface LoginUserResponseDto {
  user: Omit<UserEntity, "password">;
}
