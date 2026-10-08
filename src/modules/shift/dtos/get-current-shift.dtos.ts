import type { ManagerVerificationMethodEnum } from "../../../shared/enums/shift/manager-verification-method.enum";
import type { ShiftVerifierEnum } from "../../../shared/enums/shift/shift-verifier.enum";
import type { DeviceShiftDto } from "./shift.dtos";

export interface GetCurrentShiftResponseDto {
  /** The shift open on this counter, whoever it belongs to. */
  shift: DeviceShiftDto | null;
  /** False when the open shift belongs to another staff member. */
  isOwnShift: boolean;
  /** Currency of the branch market, for cash amounts shown before a shift exists. */
  currencyCode: string | null;
  shiftVerifier: ShiftVerifierEnum;
  managerVerificationMethod: ManagerVerificationMethodEnum;
}
