export interface DeviceStaffTokenDto {
  sessionId: string;
  deviceId: string;
  userId: string;
  /** The staff member's own branch; null for an organization-level user. */
  userBranchId: string | null;
}
