import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { RazorpayProvider } from "../../shared/providers/finance/razorpay.provider";
import type { CreateTenantTaxProfileBodyDto } from "./dtos/create-tenant-tax-profile.dtos";
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
  getTaxProfiles = async (req: Request, res: Response): Promise<void> => {
    const profiles = await this.financeService.getTenantTaxProfiles({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json({ profiles });
  };

  createTaxProfile = async (req: Request, res: Response): Promise<void> => {
    const data = await FinanceValidator.createTaxProfile.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const profile = await this.financeService.createTenantTaxProfile({
      data: data as CreateTenantTaxProfileBodyDto,
      user: req.user as UserTokenDto,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.CREATED).json({ profile });
  };

  updateTaxProfile = async (req: Request, res: Response): Promise<void> => {
    const data = await FinanceValidator.updateTaxProfile.validate(
      { ...req.body, id: req.params.id },
      { abortEarly: false, stripUnknown: true },
    );

    const profile = await this.financeService.updateTenantTaxProfile({
      data: data as UpdateTenantTaxProfileBodyDto,
      user: req.user as UserTokenDto,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json({ profile });
  };

  updateTaxProfileStatus = async (req: Request, res: Response): Promise<void> => {
    const data = await FinanceValidator.updateTaxProfileStatus.validate(
      { ...req.body, id: req.params.id },
      { abortEarly: false, stripUnknown: true },
    );

    const profile = await this.financeService.updateTenantTaxProfileStatus({
      data,
      user: req.user as UserTokenDto,
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json({ profile });
  };
}
