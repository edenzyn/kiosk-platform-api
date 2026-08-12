import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { ActivateLicenseRequestDto } from "./dtos/activate-license.dtos";
import type { LicenseService } from "./license.service";
import { LicenseValidator } from "./license.validator";

export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  // ========================================
  // ? USER CLIENT APIS
  // ========================================
  // user apis

  // ========================================
  // ? DEVICE CLIENT APIS
  // ========================================
  activateLicense = async (req: Request, res: Response): Promise<void> => {
    const device = req.device as DeviceTokenDto;

    const data = await LicenseValidator.activate.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.licenseService.activateLicenseByKey(
      data as ActivateLicenseRequestDto,
      device.id,
    );

    res.status(HttpStatusCodes.OK).json(result);
  };
}
