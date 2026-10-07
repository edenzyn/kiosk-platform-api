import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import type { DeviceTokenDto } from "../../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../../shared/dtos/user-token.dto";
import type { PhonePeProvider } from "../../../shared/providers/finance/phonepe/phonepe.provider";
import type { PhonePeWebhookPayload } from "../../../shared/providers/finance/phonepe/phonepe.types";
import type { RazorpayProvider } from "../../../shared/providers/finance/razorpay/razorpay.provider";
import type { OrderPaymentService } from "../../order/services/order-payment.service";
import type { PaymentProviderService } from "../services/payment-provider.service";
import type { RazorpayWebhookPayload } from "../types/payment-provider.types";
import { PaymentProviderValidator } from "../validators/payment-provider.validator";

export class PaymentProviderController {
  constructor(
    private readonly paymentProviderService: PaymentProviderService,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly phonePeProvider: PhonePeProvider,
    private readonly orderPaymentService: OrderPaymentService,
  ) {}

  // ========================================
  // ? WEBHOOKS
  // ========================================
  razorpayWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;

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

    await this.paymentProviderService.handleRazorpayWebhook({
      headers: req.headers,
      body: req.body as RazorpayWebhookPayload,
    });
    res.sendStatus(HttpStatusCodes.OK);
  };

  phonePeWebhook = async (req: Request, res: Response): Promise<void> => {
    const isValid = this.phonePeProvider.verifyWebhookAuthorization(
      req.headers.authorization,
    );
    if (!isValid) {
      res.sendStatus(HttpStatusCodes.UNAUTHORIZED);
      return;
    }

    await this.orderPaymentService.handlePhonePeWebhook({
      body: req.body as PhonePeWebhookPayload,
    });
    res.sendStatus(HttpStatusCodes.OK);
  };

  // ========================================
  // ? PLATFORM PAYMENT PROVIDER APIS
  // ========================================
  getPaymentProviders = async (req: Request, res: Response): Promise<void> => {
    const query =
      await PaymentProviderValidator.getPaymentProvidersQuery.validate(
        req.query,
        { abortEarly: false, stripUnknown: true },
      );

    const result = await this.paymentProviderService.getPaymentProviders({
      query,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  updatePaymentProvider = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const params = await PaymentProviderValidator.providerIdParam.validate(
      req.params,
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );
    const dto = await PaymentProviderValidator.updatePaymentProvider.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.paymentProviderService.updatePaymentProvider({
      providerId: params.id,
      dto,
      currentUser: req.user as UserTokenDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  togglePaymentProviderStatus = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const params = await PaymentProviderValidator.providerIdParam.validate(
      req.params,
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const result =
      await this.paymentProviderService.togglePaymentProviderStatus({
        providerId: params.id,
        currentUser: req.user as UserTokenDto,
      });
    res.status(HttpStatusCodes.OK).json(result);
  };

  // ========================================
  // ? TENANT PAYMENT CONFIG APIS
  // ========================================
  getDevicePaymentMethods = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const result = await this.paymentProviderService.getDevicePaymentMethods({
      device: req.device as DeviceTokenDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getTenantPaymentConfigs = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const result = await this.paymentProviderService.getTenantPaymentConfigs({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  saveTenantPaymentConfig = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const dto = await PaymentProviderValidator.saveTenantPaymentConfig.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.paymentProviderService.saveTenantPaymentConfig({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      user: req.user as UserTokenDto,
      dto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  saveCashPaymentConfig = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const dto = await PaymentProviderValidator.saveCashPaymentConfig.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.paymentProviderService.saveCashPaymentConfig({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      dto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  testTenantPaymentConfig = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const dto = await PaymentProviderValidator.testTenantPaymentConfig.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.paymentProviderService.testTenantPaymentConfig({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      dto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };
}
