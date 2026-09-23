import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { DeviceTokenDto } from "../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { RazorpayProvider } from "../../shared/providers/finance/razorpay.provider";
import type { UpdateTenantTaxProfileBodyDto } from "./dtos/update-tenant-tax-profile.dtos";
import type { RazorpayWebhookPayload } from "./finance.types";
import type { FinanceService } from "./finance.service";
import { FinanceValidator } from "./finance.validator";

export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly razorpayProvider: RazorpayProvider,
  ) {}

  // ========================================
  // ? WEBHOOKS
  // ========================================
  razorpayWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers["x-razorpay-signature"] as
      | string
      | undefined;

    if (!req.rawBody || !signature) {
      res.sendStatus(HttpStatusCodes.UNAUTHORIZED);
      return;
    }

    const isValid = this.razorpayProvider.verifyWebhookSignature(
      req.rawBody.toString(),
      signature,
    );
    if (!isValid) {
      res.sendStatus(HttpStatusCodes.UNAUTHORIZED);
      return;
    }

    await this.financeService.handleRazorpayWebhook({
      headers: req.headers,
      body: req.body as RazorpayWebhookPayload,
    });
    res.sendStatus(HttpStatusCodes.OK);
  };

  // ========================================
  // ? TENANT TAX PROFILE APIS
  // ========================================
  getTaxProfile = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await FinanceValidator.getTaxProfileQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    const profile = await this.financeService.getTenantTaxProfile({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      filters: queryDto,
    });
    res.status(HttpStatusCodes.OK).json({ profile });
  };

  getDeviceTaxProfile = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await FinanceValidator.getTaxProfileQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    const device = req.device as DeviceTokenDto;
    const profile = await this.financeService.getTenantTaxProfile({
      effectiveTenant: {
        organizationId: device.organizationId,
        branchId: device.branchId,
      },
      filters: queryDto,
    });
    res.status(HttpStatusCodes.OK).json({ profile });
  };

  getBranchTaxProfile = async (req: Request, res: Response): Promise<void> => {
    const params = await FinanceValidator.getBranchTaxProfileParams.validate(
      req.params,
      { abortEarly: false, stripUnknown: true },
    );
    const queryDto = await FinanceValidator.getTaxProfileQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    const profile = await this.financeService.getBranchTaxProfileForClone({
      branchId: params.branchId,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      filters: queryDto,
    });
    res.status(HttpStatusCodes.OK).json({ profile });
  };

  updateTaxProfile = async (req: Request, res: Response): Promise<void> => {
    const data = await FinanceValidator.updateTaxProfile.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const profile = await this.financeService.updateTenantTaxProfile({
      data: data as UpdateTenantTaxProfileBodyDto,
      user: req.user as UserTokenDto,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json({ profile });
  };
}
