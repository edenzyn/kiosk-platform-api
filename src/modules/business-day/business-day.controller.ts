import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { BusinessDayService } from "./business-day.service";
import { BusinessDayValidator } from "./business-day.validator";
import type { GetBusinessDaysQueryDto } from "./dtos/get-business-days.dtos";

export class BusinessDayController {
  constructor(private readonly businessDayService: BusinessDayService) {}

  // ========================================
  // ? USER BUSINESS DAY APIS
  // ========================================
  getCurrentBusinessDay = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const result = await this.businessDayService.getCurrentBusinessDay({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  openBusinessDay = async (req: Request, res: Response): Promise<void> => {
    const dto = await BusinessDayValidator.openBusinessDay.validate(
      req.body ?? {},
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.businessDayService.openBusinessDay({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      user: req.user as UserTokenDto,
      dto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  closeBusinessDay = async (req: Request, res: Response): Promise<void> => {
    const result = await this.businessDayService.closeBusinessDay({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      user: req.user as UserTokenDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getBusinessDays = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await BusinessDayValidator.getBusinessDaysQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.businessDayService.getBusinessDays({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      filters: queryDto as GetBusinessDaysQueryDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getBusinessDayLogs = async (req: Request, res: Response): Promise<void> => {
    const { id } = await BusinessDayValidator.businessDayIdParams.validate(
      req.params,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.businessDayService.getBusinessDayLogs({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      businessDayId: id,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  // ========================================
  // ? DEVICE BUSINESS DAY APIS
  // ========================================
  getDeviceBusinessDay = async (req: Request, res: Response): Promise<void> => {
    const result = await this.businessDayService.getDeviceBusinessDay({
      device: req.device as DeviceTokenDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };
}
