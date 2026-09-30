import { env } from "../../../../config/env";
import { HttpStatusCodes } from "../../../constants/http-status-codes.constants";
import { ErrorCodes } from "../../../enums/core/error-codes.enum";
import { AppError } from "../../../errors/app-error";
import { toMinorUnits } from "../../../utils/finance/currency.helper";
import { PHONEPE_SUPPORTED_CURRENCY_CODES } from "./phonepe.constants";
import type {
  CreatePhonePeQrPaymentInput,
  CreatePhonePeQrPaymentResult,
  PhonePeAccessToken,
  PhonePeCreatePaymentResponse,
  PhonePeCredentials,
  PhonePeErrorResponse,
  PhonePeTokenResponse,
} from "./phonepe.types";

export class PhonePeProvider {
  async getAccessToken(
    credentials: PhonePeCredentials,
  ): Promise<PhonePeAccessToken> {
    let response: Response;
    try {
      response = await fetch(`${env.PHONEPE_QR_AUTH_BASE_URL}/v1/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: credentials.clientId,
          client_version: credentials.clientVersion,
          client_secret: credentials.clientSecret,
          grant_type: "client_credentials",
        }),
      });
    } catch {
      throw new AppError("Couldn't reach PhonePe", {
        statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE,
        code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
      });
    }

    const body = (await response.json().catch(() => ({}))) as
      PhonePeTokenResponse | PhonePeErrorResponse;

    if (!response.ok || !("access_token" in body)) {
      const message =
        "message" in body && body.message
          ? body.message
          : "PhonePe rejected the credentials";
      throw new AppError(`${message}`, {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
      });
    }

    return {
      accessToken: body.access_token,
      tokenType: body.token_type,
      expiresAt: body.expires_at,
    };
  }

  async createQrPayment(
    input: CreatePhonePeQrPaymentInput,
  ): Promise<CreatePhonePeQrPaymentResult> {
    if (!PHONEPE_SUPPORTED_CURRENCY_CODES.includes(input.currencyCode)) {
      throw new AppError(
        `PhonePe doesn't support payments in ${input.currencyCode}`,
        {
          statusCode: HttpStatusCodes.BAD_REQUEST,
          code: ErrorCodes.BAD_REQUEST,
        },
      );
    }

    const { accessToken, tokenType } = await this.getAccessToken(
      input.credentials,
    );

    const requestPayload = {
      merchantOrderId: input.merchantOrderId,
      amount: toMinorUnits(input.amount, input.currencyCode),
      expireAfter: input.expireAfterSeconds,
      paymentFlow: {
        type: "PG",
        paymentMode: { type: "UPI_QR" },
      },
    };

    let response: Response;
    try {
      response = await fetch(`${env.PHONEPE_QR_BASE_URL}/payments/v2/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${tokenType} ${accessToken}`,
        },
        body: JSON.stringify(requestPayload),
      });
    } catch {
      throw new AppError("Couldn't reach PhonePe", {
        statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE,
        code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
      });
    }

    const body = (await response.json().catch(() => ({}))) as
      PhonePeCreatePaymentResponse | PhonePeErrorResponse;

    if (!response.ok || !("qrData" in body) || !body.qrData) {
      const message =
        "message" in body && body.message
          ? body.message
          : "PhonePe couldn't create the QR payment";
      throw new AppError(message, {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
      });
    }

    return {
      providerOrderId: body.orderId,
      state: body.state,
      qrData: body.qrData,
      expiresAt: new Date(body.expireAt),
      requestPayload,
      responsePayload: body as unknown as Record<string, unknown>,
    };
  }
}
