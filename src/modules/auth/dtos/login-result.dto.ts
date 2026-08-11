import { ClientTypeEnum } from "../../../shared/enums/core/client-type.enum";
import type { UserPermissions } from "../../../shared/enums/rbac/user-permission.enum";
import type { UserScope } from "../../user/dtos/check-auth-response.dto";
import type { UserEntity } from "../../user/schemas/user.schema";
import type { AuthTokens } from "./auth-tokens.dto";

export interface LoginResult {
  clientType: ClientTypeEnum.USER_CLIENT;
  user: Omit<UserEntity, "password">;
  tokens: AuthTokens;
  permissions: UserPermissions[];
  availableScopes: UserScope[];
}
