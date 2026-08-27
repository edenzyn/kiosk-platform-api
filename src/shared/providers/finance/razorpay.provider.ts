import type Razorpay from "razorpay";
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

export interface FetchRazorpayOrderResult {
  id: string;
  amount: number;
  amountPaid: number;
  currency: string;
  status: "created" | "attempted" | "paid";
}

export class RazorpayProvider {
  constructor(private readonly razorpayClient: Razorpay) {}

  async createOrder(
    input: CreateRazorpayOrderInput,
  ): Promise<CreateRazorpayOrderResult> {
    try {
      const order = await this.razorpayClient.orders.create({
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

  async fetchOrder(orderId: string): Promise<FetchRazorpayOrderResult> {
    try {
      const order = await this.razorpayClient.orders.fetch(orderId);

      return {
        id: order.id,
        amount: Number(order.amount),
        amountPaid: Number(order.amount_paid),
        currency: order.currency,
        status: order.status,
      };
    } catch (error) {
      throw new AppError("Failed to fetch order", {
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
