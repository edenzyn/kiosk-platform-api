import type { LoginUserRequestDto } from "./login-user-request.dto";

export interface RegisterUserRequestDto extends LoginUserRequestDto {
  name: string;
}
