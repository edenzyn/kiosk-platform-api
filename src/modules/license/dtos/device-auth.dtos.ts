import type { LicenseStatusEnum } from "../../../shared/enums/license/license-status.enum";

export interface LicenseAuthResponseDto {
  id: string;
  organizationId: string | null;
  branchId: string | null;
  marketId: string;
  isRedeemed: boolean;
  status: LicenseStatusEnum;
  activatedAt: Date | null;
  expiresAt: Date | null;
  gracePeriodExpiresAt?: string;
}
