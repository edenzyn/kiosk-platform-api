import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../shared/enums/license/license-discount-rule-target-entity-type.enum";
import type { ActivateLicenseRequestDto } from "./dtos/activate-license.dtos";
import type { LicenseService } from "./license.service";
import { LicenseValidator } from "./license.validator";

export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  // ========================================
  // ? USER CLIENT APIS
  // ========================================
  getLicenses = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await LicenseValidator.getLicensesQuery.validate(
      req.query,
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const result = await this.licenseService.getLicenses({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      filters: queryDto,
    });

    res.status(HttpStatusCodes.OK).json(result);
  };

  purchaseLicense = async (req: Request, res: Response): Promise<void> => {
    const data = await LicenseValidator.purchaseLicense.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const user = req.user as UserTokenDto;
    const result = await this.licenseService.purchaseLicense({
      dto: data,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      userId: user.id,
    });

    res.status(HttpStatusCodes.CREATED).json(result);
  };

  assignLicenseToBranch = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await LicenseValidator.assignToBranch.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const user = req.user as UserTokenDto;
    const result = await this.licenseService.assignLicenseToBranch({
      licenseId: req.params.id as string,
      branchId: data.branchId,
      userId: user.id,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });

    res.status(HttpStatusCodes.OK).json(result);
  };

  assignLicenseToDevice = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await LicenseValidator.assignToDevice.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const user = req.user as UserTokenDto;
    const result = await this.licenseService.assignLicenseToDevice({
      licenseId: req.params.id as string,
      deviceId: data.deviceId,
      userId: user.id,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });

    res.status(HttpStatusCodes.OK).json(result);
  };

  extendLicense = async (req: Request, res: Response): Promise<void> => {
    const data = await LicenseValidator.extendLicense.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const user = req.user as UserTokenDto;
    const result = await this.licenseService.extendLicense({
      licenseId: req.params.id as string,
      dto: data,
      userId: user.id,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });

    res.status(HttpStatusCodes.OK).json(result);
  };

  getPricingPlans = async (req: Request, res: Response): Promise<void> => {
    const query = await LicenseValidator.getPricingPlansQuery.validate(
      req.query,
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const result = await this.licenseService.getLicensePricingPlans({
      id: query.id,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getDiscountRules = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.licenseService.getDiscountRules({
      targetEntity: LicenseDiscountRuleTargetEntityTypeEnum.ORGANIZATIONS,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  // ========================================
  // ? PLATFORM CLIENT APIS
  // ========================================
  getPlatformDiscountRules = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const query = await LicenseValidator.getPlatformDiscountRulesQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.licenseService.getPlatformDiscountRules({
      query,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  createDiscountRule = async (req: Request, res: Response): Promise<void> => {
    const dto = await LicenseValidator.createDiscountRule.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const currentUser = req.user as UserTokenDto;
    const result = await this.licenseService.createDiscountRule({
      dto,
      currentUser,
    });
    res.status(HttpStatusCodes.CREATED).json(result);
  };

  toggleDiscountRuleStatus = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const params = await LicenseValidator.discountRuleIdParam.validate(
      req.params,
      { abortEarly: false, stripUnknown: true },
    );

    const currentUser = req.user as UserTokenDto;
    const result = await this.licenseService.toggleDiscountRuleStatus({
      ruleId: params.id,
      currentUser,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getPlatformPricingPlans = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const query = await LicenseValidator.getPlatformPricingPlansQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.licenseService.getPlatformPricingPlans({
      query,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  createPricingPlan = async (req: Request, res: Response): Promise<void> => {
    const dto = await LicenseValidator.createPricingPlan.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const currentUser = req.user as UserTokenDto;
    const result = await this.licenseService.createPricingPlan({
      dto,
      currentUser,
    });
    res.status(HttpStatusCodes.CREATED).json(result);
  };

  togglePricingPlanStatus = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const params = await LicenseValidator.pricingPlanIdParam.validate(
      req.params,
      { abortEarly: false, stripUnknown: true },
    );

    const currentUser = req.user as UserTokenDto;
    const result = await this.licenseService.togglePricingPlanStatus({
      planId: params.id,
      currentUser,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  updatePricingPlan = async (req: Request, res: Response): Promise<void> => {
    const params = await LicenseValidator.pricingPlanIdParam.validate(
      req.params,
      { abortEarly: false, stripUnknown: true },
    );
    const dto = await LicenseValidator.createPricingPlan.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const currentUser = req.user as UserTokenDto;
    const result = await this.licenseService.updatePricingPlan({
      planId: params.id,
      dto,
      currentUser,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getLicenseHistory = async (req: Request, res: Response): Promise<void> => {
    const params = await LicenseValidator.licenseIdParam.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.licenseService.getLicenseHistory({
      licenseId: params.id,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getLicenseDetails = async (req: Request, res: Response): Promise<void> => {
    const params = await LicenseValidator.licenseIdParam.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.licenseService.getLicenseDetails({
      licenseId: params.id,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  // ========================================
  // ? RESELLER CLIENT APIS
  // ========================================
  getLicensesForReseller = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const queryDto = await LicenseValidator.getLicensesQuery.validate(
      req.query,
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const user = req.user as UserTokenDto;
    const result = await this.licenseService.getLicensesForReseller({
      resellerId: user.id,
      filters: queryDto,
    });

    res.status(HttpStatusCodes.OK).json(result);
  };

  purchaseLicenseAsReseller = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await LicenseValidator.purchaseLicense.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const user = req.user as UserTokenDto;
    const result = await this.licenseService.purchaseLicenseAsReseller({
      dto: data,
      resellerId: user.id,
    });

    res.status(HttpStatusCodes.CREATED).json(result);
  };

  generateRedemptionCode = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await LicenseValidator.generateRedemptionCode.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    const user = req.user as UserTokenDto;
    const result = await this.licenseService.generateRedemptionCode({
      resellerId: user.id,
      dto: data,
    });

    res.status(HttpStatusCodes.CREATED).json(result);
  };

  getRedemptionCodesForReseller = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const queryDto = await LicenseValidator.getRedemptionCodesQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    const user = req.user as UserTokenDto;
    const result = await this.licenseService.getRedemptionCodesForReseller({
      resellerId: user.id,
      filters: queryDto,
    });

    res.status(HttpStatusCodes.OK).json(result);
  };

  revokeRedemptionCode = async (req: Request, res: Response): Promise<void> => {
    const params = await LicenseValidator.redemptionCodeIdParam.validate(
      req.params,
      { abortEarly: false, stripUnknown: true },
    );

    const user = req.user as UserTokenDto;
    await this.licenseService.revokeRedemptionCode({
      resellerId: user.id,
      redemptionId: params.id,
    });

    res.status(HttpStatusCodes.OK).json({ success: true });
  };

  getRedemptionCodeDetails = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const params = await LicenseValidator.redemptionCodeIdParam.validate(
      req.params,
      { abortEarly: false, stripUnknown: true },
    );

    const user = req.user as UserTokenDto;
    const result = await this.licenseService.getRedemptionCodeDetailsForReseller({
      resellerId: user.id,
      redemptionId: params.id,
    });

    res.status(HttpStatusCodes.OK).json(result);
  };

  verifyRedemptionCode = async (req: Request, res: Response): Promise<void> => {
    const params = await LicenseValidator.redemptionCodeIdParam.validate(
      req.params,
      { abortEarly: false, stripUnknown: true },
    );
    const data = await LicenseValidator.verifyRedemptionCode.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    const user = req.user as UserTokenDto;
    await this.licenseService.verifyRedemptionCode({
      resellerId: user.id,
      redemptionId: params.id,
      dto: data,
    });

    res.status(HttpStatusCodes.OK).json({ success: true });
  };

  getResellerDiscountRules = async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    const result = await this.licenseService.getDiscountRules({
      targetEntity: LicenseDiscountRuleTargetEntityTypeEnum.RESELLERS,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getLicenseHistoryForReseller = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const params = await LicenseValidator.licenseIdParam.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    const user = req.user as UserTokenDto;
    const result = await this.licenseService.getLicenseHistoryForReseller({
      licenseId: params.id,
      resellerId: user.id,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getLicenseDetailsForReseller = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const params = await LicenseValidator.licenseIdParam.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    const user = req.user as UserTokenDto;
    const result = await this.licenseService.getLicenseDetailsForReseller({
      licenseId: params.id,
      resellerId: user.id,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  // ========================================
  // ? DEVICE CLIENT APIS
  // ========================================
  activateLicense = async (req: Request, res: Response): Promise<void> => {
    const device = req.device as DeviceTokenDto;

    const data = await LicenseValidator.activate.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.licenseService.activateLicenseByKey({
      dto: data as ActivateLicenseRequestDto,
      deviceId: device.id,
      deviceBranchId: device.branchId,
    });

    res.status(HttpStatusCodes.OK).json(result);
  };
}
