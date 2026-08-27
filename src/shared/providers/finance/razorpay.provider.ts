import Razorpay from "razorpay";
import {
  validatePaymentVerification,
  validateWebhookSignature,
} from "razorpay/dist/utils/razorpay-utils";
import { env } from "../../../config/env";
import { HttpStatusCodes } from "../../constants/http-status-codes.constants";
import { ErrorCodes } from "../../enums/core/error-codes.enum";
import { AppError } from "../../errors/app-error";

export interface CreateRazorpayOrderInput {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateRazorpayOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  receipt?: string;
}

export interface VerifyRazorpayPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export class RazorpayProvider {
  private readonly client: Razorpay;

  constructor() {
    this.client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  async createOrder(
    input: CreateRazorpayOrderInput,
  ): Promise<CreateRazorpayOrderResult> {
    try {
      const order = await this.client.orders.create({
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes,
      });

      return {
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        receipt: order.receipt,
      };
    } catch (error) {
      throw new AppError("Failed to create Razorpay order", {
        statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE,
        code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
        details: error,
      });
    }
  }

  verifyPaymentSignature(input: VerifyRazorpayPaymentInput): boolean {
    return validatePaymentVerification(
      { order_id: input.orderId, payment_id: input.paymentId },
      input.signature,
      env.RAZORPAY_KEY_SECRET,
    );
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    return validateWebhookSignature(
      rawBody,
      signature,
      env.RAZORPAY_WEBHOOK_SECRET,
    );
  }
}
