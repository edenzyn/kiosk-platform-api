export enum UserInvitationStatusEnum {
  PENDING = 1,
  ACCEPTED = 2,
  EXPIRED = 3,
  REVOKED = 4,
}

export const USER_INVITATION_STATUS_LABELS = {
  [UserInvitationStatusEnum.PENDING]: "Pending",
  [UserInvitationStatusEnum.ACCEPTED]: "Accepted",
  [UserInvitationStatusEnum.EXPIRED]: "Expired",
  [UserInvitationStatusEnum.REVOKED]: "Revoked",
};
