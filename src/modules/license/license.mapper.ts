import type { LicenseStatusEnum } from "../../shared/enums/license/license-status.enum";
import type { LicenseAuthResponseDto } from "./dtos/device-auth.dtos";
import type { LicenseEntity } from "./schemas/license.schema";

export class LicenseMapper {
  static toDeviceAuthResponse(
    license: LicenseEntity,
    gracePeriodExpiresAt?: string,
  ): LicenseAuthResponseDto {
    return {
      id: license.id,
      organizationId: license.organizationId,
      branchId: license.branchId,
      marketId: license.marketId,
      isRedeemed: license.isRedeemed,
      status: license.status as LicenseStatusEnum,
      activatedAt: license.activatedAt,
      expiresAt: license.expiresAt,
      ...(gracePeriodExpiresAt ? { gracePeriodExpiresAt } : {}),
    };
  }
}
