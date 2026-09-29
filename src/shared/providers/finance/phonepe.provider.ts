import { env } from "../../../config/env";
import { HttpStatusCodes } from "../../constants/http-status-codes.constants";
import { ErrorCodes } from "../../enums/core/error-codes.enum";
import { AppError } from "../../errors/app-error";

// ========================================
// ? CONFIG MODEL
// ========================================
export interface PhonePeQrPaymentConfig {
  clientId: string;
  clientSecret: string;
  clientVersion: string;
}

// ========================================
// ? INPUTS & RESULTS
// ========================================
export type PhonePeCredentials = PhonePeQrPaymentConfig;

export interface PhonePeAccessToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
}

interface PhonePeTokenResponse {
  access_token: string;
  token_type: string;
  expires_at: number;
}

interface PhonePeErrorResponse {
  code?: string;
  message?: string;
}

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
}
