import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import type { UserTokenDto } from "../../../shared/dtos/user-token.dto";
import type { RazorpayProvider } from "../../../shared/providers/finance/razorpay.provider";
import type { PaymentProviderService } from "../services/payment-provider.service";
import type { RazorpayWebhookPayload } from "../types/payment-provider.types";
import { PaymentProviderValidator } from "../validators/payment-provider.validator";

export class PaymentProviderController {
  constructor(
    private readonly paymentProviderService: PaymentProviderService,
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

    await this.paymentProviderService.handleRazorpayWebhook({
      headers: req.headers,
      body: req.body as RazorpayWebhookPayload,
    });
    res.sendStatus(HttpStatusCodes.OK);
  };

  // ========================================
  // ? PLATFORM PAYMENT PROVIDER APIS
  // ========================================
  getPaymentProviders = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.paymentProviderService.getPaymentProviders();
    res.status(HttpStatusCodes.OK).json(result);
  };

  createPaymentProvider = async (req: Request, res: Response): Promise<void> => {
    const dto = await PaymentProviderValidator.createPaymentProvider.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.paymentProviderService.createPaymentProvider({
      dto,
      currentUser: req.user as UserTokenDto,
    });
    res.status(HttpStatusCodes.CREATED).json(result);
  };

  updatePaymentProvider = async (req: Request, res: Response): Promise<void> => {
    const params = await PaymentProviderValidator.providerIdParam.validate(
      req.params,
      { abortEarly: false, stripUnknown: true },
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
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.paymentProviderService.togglePaymentProviderStatus(
      { providerId: params.id, currentUser: req.user as UserTokenDto },
    );
    res.status(HttpStatusCodes.OK).json(result);
  };
}
