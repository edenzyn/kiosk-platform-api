import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { PaymentStatusEnum } from "../../shared/enums/license/payment-status.enum";
import { AppError } from "../../shared/errors/app-error";
import type {
  CreateRazorpayOrderInput,
  CreateRazorpayOrderResult,
  RazorpayProvider,
} from "../../shared/providers/finance/razorpay.provider";
import { logger } from "../../shared/utils/core/logger";
import type { LicenseTransactionRepository } from "../license/repositories/license-transaction.repository";
import type {
  HandleRazorpayWebhookServiceInput,
  VerifyRazorpayPaymentServiceInput,
} from "./finance.types";

export class FinanceService {
  constructor(
    private readonly razorpayProvider: RazorpayProvider,
    private readonly licenseTransactionRepository: LicenseTransactionRepository,
  ) {}

  // ========================================
  // ? PAYMENT WEBHOOKS
  // ========================================
  async handleRazorpayWebhook(
    input: HandleRazorpayWebhookServiceInput,
  ): Promise<void> {
    logger.log(
      `[FinanceService] Razorpay webhook received: ${JSON.stringify({
        headers: input.headers,
        body: input.body,
      })}`,
    );

    const { event, payload } = input.body;
    const payment = payload.payment?.entity;
    if (!payment?.order_id) return;

    if (event === "payment.failed") {
      const failureReason =
        payment.error_description ?? payment.error_reason ?? "Payment failed";

      await this.licenseTransactionRepository.updateTransactionStatusByOrderId({
        paymentProviderOrderId: payment.order_id,
        currentPaymentStatus: PaymentStatusEnum.PENDING,
        newPaymentStatus: PaymentStatusEnum.FAILED,
        paymentReference: payment.id,
        failureReason,
      });
    }
  }

  // ========================================
  // ? PAYMENTS
  // ========================================
  async createRazorpayOrder(
    input: CreateRazorpayOrderInput,
  ): Promise<CreateRazorpayOrderResult> {
    return this.razorpayProvider.createOrder(input);
  }

  async verifyRazorpayPayment(
    params: VerifyRazorpayPaymentServiceInput,
  ): Promise<void> {
    const isSignatureValid = this.razorpayProvider.verifyPaymentSignature({
      orderId: params.razorpayOrderId,
      paymentId: params.razorpayPaymentId,
      signature: params.razorpaySignature,
    });
    if (!isSignatureValid) {
      throw new AppError("Payment verification failed", {
        statusCode: HttpStatusCodes.PAYMENT_REQUIRED,
        code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
      });
    }

    const order = await this.razorpayProvider.fetchOrder(
      params.razorpayOrderId,
    );

    const expectedAmountInSubunits = Math.round(
      Number(params.expectedAmount) * 100,
    );
    const isValid =
      order.status === "paid" &&
      order.amount === expectedAmountInSubunits &&
      order.currency === params.expectedCurrency;

    if (!isValid) {
      throw new AppError("Payment verification failed", {
        statusCode: HttpStatusCodes.PAYMENT_REQUIRED,
        code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
      });
    }
  }
}
