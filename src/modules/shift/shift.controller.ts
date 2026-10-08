import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { DeviceStaffTokenDto } from "../../shared/dtos/device-staff-token.dto";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { EndShiftBodyDto } from "./dtos/end-shift.dtos";
import type { GetShiftManagersQueryDto } from "./dtos/get-shift-managers.dtos";
import type { StartShiftBodyDto } from "./dtos/start-shift.dtos";
import type { ShiftService } from "./shift.service";
import { ShiftValidator } from "./shift.validator";

export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  // ========================================
  // ? DEVICE SHIFT APIS
  // ========================================
  getCurrentShift = async (req: Request, res: Response): Promise<void> => {
    const result = await this.shiftService.getCurrentShift({
      device: req.device as DeviceTokenDto,
      staff: req.deviceStaff as DeviceStaffTokenDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getShiftSummary = async (req: Request, res: Response): Promise<void> => {
    const result = await this.shiftService.getShiftSummary({
      device: req.device as DeviceTokenDto,
      staff: req.deviceStaff as DeviceStaffTokenDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getShiftManagers = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await ShiftValidator.getShiftManagersQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.shiftService.getShiftManagers({
      device: req.device as DeviceTokenDto,
      staff: req.deviceStaff as DeviceStaffTokenDto,
      filters: queryDto as GetShiftManagersQueryDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  sendShiftVerificationCode = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const dto = await ShiftValidator.sendShiftVerificationCode.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.shiftService.sendShiftVerificationCode({
      device: req.device as DeviceTokenDto,
      staff: req.deviceStaff as DeviceStaffTokenDto,
      dto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  startShift = async (req: Request, res: Response): Promise<void> => {
    const dto = await ShiftValidator.startShift.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.shiftService.startShift({
      device: req.device as DeviceTokenDto,
      staff: req.deviceStaff as DeviceStaffTokenDto,
      dto: dto as StartShiftBodyDto,
    });
    res.status(HttpStatusCodes.CREATED).json(result);
  };

  endShift = async (req: Request, res: Response): Promise<void> => {
    const dto = await ShiftValidator.endShift.validate(req.body ?? {}, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.shiftService.endShift({
      device: req.device as DeviceTokenDto,
      staff: req.deviceStaff as DeviceStaffTokenDto,
      dto: dto as EndShiftBodyDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };
}
