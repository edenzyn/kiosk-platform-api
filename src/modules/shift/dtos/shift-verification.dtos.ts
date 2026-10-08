import type { DeviceAdminAuthMethodEnum } from "../../../shared/enums/device/device-admin-auth-method.enum";

/** The shift manager confirming a shift; sent only when the branch asks for one. */
export interface ShiftVerificationBodyDto {
  managerId: string;
  /** PIN or password, when the branch verifies with PIN or password. */
  method?: DeviceAdminAuthMethodEnum;
  secret?: string;
  /** The one-time code, when the branch verifies with a code. */
  verificationId?: string;
  code?: string;
}
