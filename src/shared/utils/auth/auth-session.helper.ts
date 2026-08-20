import { env } from "../../../config/env";
import { UserTypeEnums } from "../../enums/user/user-type.enum";

export function getSessionLimitForUserType(userType: UserTypeEnums): number {
  switch (userType) {
    case UserTypeEnums.PLATFORM:
      return env.PLATFORM_USER_SESSION_LIMIT;
    case UserTypeEnums.RESELLER:
      return env.RESELLER_USER_SESSION_LIMIT;
    default:
      return env.NORMAL_USER_SESSION_LIMIT;
  }
}

export function isSessionAutoLogoutEnabled(userType: UserTypeEnums): boolean {
  switch (userType) {
    case UserTypeEnums.PLATFORM:
      return env.IS_PLATFORM_SESSION_AUTO_LOGOUT_ENABLED;
    case UserTypeEnums.RESELLER:
      return env.IS_RESELLER_SESSION_AUTO_LOGOUT_ENABLED;
    default:
      return env.IS_NORMAL_SESSION_AUTO_LOGOUT_ENABLED;
  }
}
