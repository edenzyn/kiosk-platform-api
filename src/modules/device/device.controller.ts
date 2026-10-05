import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { DeviceAdminTokenDto } from "../../shared/dtos/device-admin-token.dto";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { AppError } from "../../shared/errors/app-error";
import type { DeviceService } from "./device.service";
import { DeviceValidator } from "./device.validator";
import type { CreateDeviceBodyDto } from "./dtos/create-device.dtos";
import type { DeviceAdminLoginBodyDto } from "./dtos/device-admin.dtos";
import type { UpdateDeviceBodyDto } from "./dtos/update-device.dtos";

export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  // ========================================
  // ? USER CLIENT APIS
  // ========================================
  createDevice = async (req: Request, res: Response): Promise<void> => {
    const data = await DeviceValidator.create.validate(
      { ...req.effectiveTenant, ...req.body },
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const device = await this.deviceService.createDevice({
      data: data as CreateDeviceBodyDto,
      user: req.user as UserTokenDto,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.CREATED).json({ device });
  };

  getDevices = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await DeviceValidator.getDevicesQuery.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.deviceService.getDevices({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      filters: queryDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getDeviceDetails = async (req: Request, res: Response): Promise<void> => {
    const { id } = await DeviceValidator.deviceIdParams.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.deviceService.getDeviceDetails({
      id,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  revokeDeviceSession = async (req: Request, res: Response): Promise<void> => {
    const { id } = await DeviceValidator.deviceIdParams.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    await this.deviceService.revokeDeviceSession({
      id,
      user: req.user as UserTokenDto,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json({ message: "Device session revoked" });
  };

  getDeviceLogs = async (req: Request, res: Response): Promise<void> => {
    const { id } = await DeviceValidator.deviceIdParams.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });
    const queryDto = await DeviceValidator.getDeviceLogsQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.deviceService.getDeviceLogs({
      id,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      filters: queryDto,
    });
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

    const device = await this.deviceService.updateDevice({
      data: data as UpdateDeviceBodyDto,
      user: req.user as UserTokenDto,
    });
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

    const device = await this.deviceService.toggleDeviceStatus({
      id: data.id,
      user: req.user as UserTokenDto,
    });
    res.status(HttpStatusCodes.OK).json({ device });
  };

  mapDeviceTerminal = async (req: Request, res: Response): Promise<void> => {
    const data = await DeviceValidator.mapTerminal.validate(
      { id: req.params.id, terminalId: req.body?.terminalId },
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const device = await this.deviceService.mapDeviceTerminal({
      id: data.id,
      terminalId: data.terminalId,
      user: req.user as UserTokenDto,
    });
    res.status(HttpStatusCodes.OK).json({ device });
  };

  // ========================================
  // ? DEVICE CLIENT APIS
  // ========================================
  deviceAuthCheck = async (req: Request, res: Response): Promise<void> => {
    const deviceId = req.device?.id;
    if (!deviceId) {
      throw new AppError("No device session found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    const result = await this.deviceService.deviceAuthCheck({ id: deviceId });
    res.status(HttpStatusCodes.OK).json(result);
  };

  // ========================================
  // ? DEVICE ADMIN APIS
  // ========================================
  deviceAdminLogin = async (req: Request, res: Response): Promise<void> => {
    const dto = await DeviceValidator.adminLogin.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.deviceService.deviceAdminLogin({
      device: req.device as DeviceTokenDto,
      dto: dto as DeviceAdminLoginBodyDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  mapOwnTerminal = async (req: Request, res: Response): Promise<void> => {
    const dto = await DeviceValidator.mapOwnTerminal.validate(
      { terminalId: req.body?.terminalId },
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.deviceService.mapOwnTerminal({
      device: req.device as DeviceTokenDto,
      admin: req.deviceAdmin as DeviceAdminTokenDto,
      dto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };
}
