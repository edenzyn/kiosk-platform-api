import type { UserEntity } from "../../user/user.schema";
import type { AuthTokens } from "./auth-tokens.dto";

export interface LoginResult {
  user: Omit<UserEntity, "password">;
  tokens: AuthTokens;
}
