import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import type { DeviceTokenDto } from "../../../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../../shared/dtos/user-token.dto";
import type { PhonePeProvider } from "../../../shared/providers/finance/phonepe/phonepe.provider";
import type { PhonePeWebhookPayload } from "../../../shared/providers/finance/phonepe/phonepe.types";
import type { RazorpayProvider } from "../../../shared/providers/finance/razorpay/razorpay.provider";
import type { OrderPaymentService } from "../../order/services/order-payment.service";
import type { PaymentService } from "../services/payment.service";
import type { RazorpayWebhookPayload } from "../types/payment.types";
import { PaymentValidator } from "../validators/payment.validator";

export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
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

    await this.paymentService.handleRazorpayWebhook({
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
    const query = await PaymentValidator.getPaymentProvidersQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.paymentService.getPaymentProviders({
      query,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  updatePaymentProvider = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const params = await PaymentValidator.providerIdParam.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });
    const dto = await PaymentValidator.updatePaymentProvider.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.paymentService.updatePaymentProvider({
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
    const params = await PaymentValidator.providerIdParam.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.paymentService.togglePaymentProviderStatus({
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
    const result = await this.paymentService.getDevicePaymentMethods({
      device: req.device as DeviceTokenDto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getTenantPaymentConfigs = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const result = await this.paymentService.getTenantPaymentConfigs({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  saveTenantPaymentConfig = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const dto = await PaymentValidator.saveTenantPaymentConfig.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.paymentService.saveTenantPaymentConfig({
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
    const dto = await PaymentValidator.saveCashPaymentConfig.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.paymentService.saveCashPaymentConfig({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      dto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  testTenantPaymentConfig = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const dto = await PaymentValidator.testTenantPaymentConfig.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.paymentService.testTenantPaymentConfig({
      effectiveTenant: req.effectiveTenant as EffectiveTenant,
      dto,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };
}
