import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../shared/enums/license/license-discount-rule-target-entity-type.enum";
import type { ActivateLicenseRequestDto } from "./dtos/activate-license.dtos";
import { LicenseValidator } from "./license.validator";
import type { LicenseDiscountService } from "./services/license-discount.service";
import type { LicensePricingService } from "./services/license-pricing.service";
import type { LicenseRedemptionService } from "./services/license-redemption.service";
import type { LicenseService } from "./services/license.service";

export class LicenseController {
  constructor(
    private readonly licenseService: LicenseService,
    private readonly licensePricingService: LicensePricingService,
    private readonly licenseDiscountService: LicenseDiscountService,
    private readonly licenseRedemptionService: LicenseRedemptionService,
  ) {}

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

  redeemLicenseCode = async (req: Request, res: Response): Promise<void> => {
    const data = await LicenseValidator.redeemLicenseCode.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    const user = req.user as UserTokenDto;
    const result = await this.licenseRedemptionService.redeemLicenseCode({
      dto: data,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      userId: user.id,
    });

    res.status(HttpStatusCodes.OK).json(result);
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

  getLicenseExtendInfo = async (req: Request, res: Response): Promise<void> => {
    const result = await this.licenseService.getLicenseExtendInfo({
      licenseId: req.params.id as string,
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

    const result = await this.licensePricingService.getLicensePricingPlans({
      id: query.id,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getDiscountRules = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.licenseDiscountService.getDiscountRules({
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

    const result = await this.licenseDiscountService.getPlatformDiscountRules({
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
    const result = await this.licenseDiscountService.createDiscountRule({
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
    const result = await this.licenseDiscountService.toggleDiscountRuleStatus({
      ruleId: params.id,
      currentUser,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  updateDiscountRule = async (req: Request, res: Response): Promise<void> => {
    const params = await LicenseValidator.discountRuleIdParam.validate(
      req.params,
      { abortEarly: false, stripUnknown: true },
    );
    const dto = await LicenseValidator.createDiscountRule.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const currentUser = req.user as UserTokenDto;
    const result = await this.licenseDiscountService.updateDiscountRule({
      ruleId: params.id,
      dto,
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

    const result = await this.licensePricingService.getPlatformPricingPlans({
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
    const result = await this.licensePricingService.createPricingPlan({
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
    const result = await this.licensePricingService.togglePricingPlanStatus({
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
    const result = await this.licensePricingService.updatePricingPlan({
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

  getAvailableLicensesForRedemption = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const queryDto = await LicenseValidator.getLicensesQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    const user = req.user as UserTokenDto;
    const result =
      await this.licenseRedemptionService.getAvailableLicensesForRedemption({
        resellerId: user.id,
        filters: queryDto,
      });

    res.status(HttpStatusCodes.OK).json(result);
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
    const result = await this.licenseRedemptionService.generateRedemptionCode({
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
    const result = await this.licenseRedemptionService.getRedemptionCodesForReseller({
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
    await this.licenseRedemptionService.revokeRedemptionCode({
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
    const result = await this.licenseRedemptionService.getRedemptionCodeDetailsForReseller({
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
    await this.licenseRedemptionService.verifyRedemptionCode({
      resellerId: user.id,
      redemptionId: params.id,
      dto: data,
    });

    res.status(HttpStatusCodes.OK).json({ success: true });
  };

  getResellerDiscountRules = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const user = req.user as UserTokenDto;
    const result = await this.licenseDiscountService.getDiscountRules({
      targetEntity: LicenseDiscountRuleTargetEntityTypeEnum.RESELLERS,
      resellerId: user.id,
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
