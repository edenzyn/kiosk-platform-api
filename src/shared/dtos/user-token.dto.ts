import type { UserTypeEnums } from "../enums/user/user-type.enum";

export interface UserTokenDto {
  id: string;
  organizationId?: string;
  branchId?: string;
  userType: UserTypeEnums;
}
