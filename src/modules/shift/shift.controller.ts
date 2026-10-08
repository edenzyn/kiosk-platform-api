import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { DeviceStaffTokenDto } from "../../shared/dtos/device-staff-token.dto";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { EndShiftBodyDto } from "./dtos/end-shift.dtos";
import type { GetShiftManagersQueryDto } from "./dtos/get-shift-managers.dtos";
import type { StartShiftBodyDto } from "./dtos/start-shift.dtos";
import type { ShiftService } from "./shift.service";
import { ShiftValidator } from "./shift.validator";

export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  // ========================================
  // ? USER SHIFT APIS
  // ========================================
  getBusinessDayShifts = async (req: Request, res: Response): Promise<void> => {
    const { businessDayId } =
      await ShiftValidator.getBusinessDayShiftsQuery.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });

    const result = await this.shiftService.getBusinessDayShifts({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      businessDayId,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  forceCloseShift = async (req: Request, res: Response): Promise<void> => {
    const { id } = await ShiftValidator.shiftIdParams.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });
    const dto = await ShiftValidator.forceCloseShift.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.shiftService.forceCloseShift({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      user: req.user as UserTokenDto,
      shiftId: id,
      dto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

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
