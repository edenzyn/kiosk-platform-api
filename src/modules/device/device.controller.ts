import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { DeviceService } from "./device.service";
import { DeviceValidator } from "./device.validator";
import type { CreateDeviceBodyDto } from "./dtos/create-device-request.dto";
import type { UpdateDeviceBodyDto } from "./dtos/update-device-request.dto";

export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  createDevice = async (req: Request, res: Response): Promise<void> => {
    const data = await DeviceValidator.create.validate(
      { ...req.effectiveTenant, ...req.body },
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const device = await this.deviceService.createDevice(
      data as CreateDeviceBodyDto,
      req.user as UserTokenDto,
      req.effectiveTenant as EffectiveTenant,
    );
    res.status(HttpStatusCodes.CREATED).json({ device });
  };

  getDevices = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await DeviceValidator.getDevicesQuery.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.deviceService.getDevices(
      req.effectiveTenant as EffectiveTenant,
      queryDto.page,
      queryDto.limit,
    );
    res.status(HttpStatusCodes.OK).json(result);
  };

  updateDevice = async (req: Request, res: Response): Promise<void> => {
    const data = await DeviceValidator.update.validate(
      { ...req.body, id: req.params.id },
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const device = await this.deviceService.updateDevice(
      data as UpdateDeviceBodyDto,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.OK).json({ device });
  };

  toggleDeviceStatus = async (req: Request, res: Response): Promise<void> => {
    const data = await DeviceValidator.toggleStatus.validate(
      { id: req.params.id },
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const device = await this.deviceService.toggleDeviceStatus(
      data.id,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.OK).json({ device });
  };
}
