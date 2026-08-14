import { UserScopeTypeEnums } from "../../enums/user/user-scope-type.enum";

export function getUserScope(user: {
  branchId?: string | null;
}): UserScopeTypeEnums {
  if (user.branchId) {
    return UserScopeTypeEnums.BRANCH;
  }
  return UserScopeTypeEnums.ORGANIZATION;
}
