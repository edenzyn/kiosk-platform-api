import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { LicenseStatusEnum } from "../../shared/enums/license/license-status.enum";
import { AppError } from "../../shared/errors/app-error";
import type { ActivateLicenseRequestDto } from "./dtos/activate-license-request.dto";
import type { ActivateLicenseResponseDto } from "./dtos/activate-license-response.dto";
import type { LicenseStatusResponseDto } from "./dtos/license-status-response.dto";
import type { LicenseRepository } from "./license.repository";

export class LicenseService {
  constructor(private readonly licenseRepository: LicenseRepository) {}

  // ========================================
  // ? DEVICE CLIENT SERVICES
  // ========================================
  async getLicenseForDevice(
    deviceId: string,
  ): Promise<LicenseStatusResponseDto> {
    const activeLicense =
      await this.licenseRepository.findActiveByDeviceId(deviceId);
    if (activeLicense) {
      const { createdBy, updatedBy, ...rest } = activeLicense;
      return {
        license: rest,
      };
    }

    const anyLicense = await this.licenseRepository.findByDeviceId(deviceId);
    if (anyLicense) {
      const { createdBy, updatedBy, ...rest } = anyLicense;
      const isExpired = rest.expiresAt && new Date(rest.expiresAt) < new Date();
      return {
        license: {
          ...rest,
          status: isExpired ? LicenseStatusEnum.EXPIRED : rest.status,
        },
      };
    }

    return {
      license: null,
    };
  }

  async activateLicenseByKey(
    dto: ActivateLicenseRequestDto,
    deviceId: string,
  ): Promise<ActivateLicenseResponseDto> {
    const license = await this.licenseRepository.findByKey(dto.licenseKey);

    if (!license) {
      throw new AppError("Invalid license key. No such license found.", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    if (license.status === LicenseStatusEnum.ACTIVE && license.deviceId) {
      throw new AppError(
        "This license key is already activated on another device.",
        {
          statusCode: HttpStatusCodes.CONFLICT,
          code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
        },
      );
    }

    if (license.status === LicenseStatusEnum.REVOKED) {
      throw new AppError("This license has been revoked.", {
        statusCode: HttpStatusCodes.FORBIDDEN,
        code: ErrorCodes.FORBIDDEN,
      });
    }

    const activated = await this.licenseRepository.activate(
      license.id,
      deviceId,
    );

    const { createdBy, updatedBy, ...rest } = activated;

    return { license: rest };
  }
}
