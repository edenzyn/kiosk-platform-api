import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import type { DeviceTokenDto } from "../../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../../shared/dtos/user-token.dto";
import type { UpdateTenantTaxProfileBodyDto } from "../dtos/update-tenant-tax-profile.dtos";
import type { TaxService } from "../services/tax.service";
import { TaxValidator } from "../validators/tax.validator";

export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  // ========================================
  // ? TENANT TAX PROFILE APIS
  // ========================================
  getTaxProfile = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await TaxValidator.getTaxProfileQuery.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    const profile = await this.taxService.getTenantTaxProfile({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      filters: queryDto,
    });
    res.status(HttpStatusCodes.OK).json({ profile });
  };

  getDeviceTaxProfile = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await TaxValidator.getTaxProfileQuery.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    const device = req.device as DeviceTokenDto;
    const profile = await this.taxService.getTenantTaxProfile({
      effectiveTenant: {
        organizationId: device.organizationId,
        branchId: device.branchId,
      },
      filters: queryDto,
    });
    res.status(HttpStatusCodes.OK).json({ profile });
  };

  getBranchTaxProfile = async (req: Request, res: Response): Promise<void> => {
    const params = await TaxValidator.getBranchTaxProfileParams.validate(
      req.params,
      { abortEarly: false, stripUnknown: true },
    );
    const queryDto = await TaxValidator.getTaxProfileQuery.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    const profile = await this.taxService.getBranchTaxProfileForClone({
      branchId: params.branchId,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      filters: queryDto,
    });
    res.status(HttpStatusCodes.OK).json({ profile });
  };

  updateTaxProfile = async (req: Request, res: Response): Promise<void> => {
    const data = await TaxValidator.updateTaxProfile.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const profile = await this.taxService.updateTenantTaxProfile({
      data: data as UpdateTenantTaxProfileBodyDto,
      user: req.user as UserTokenDto,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json({ profile });
  };
}
