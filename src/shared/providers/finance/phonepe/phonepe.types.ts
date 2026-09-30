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

export interface CreatePhonePeQrPaymentInput {
  credentials: PhonePeCredentials;
  merchantOrderId: string;
  /** Decimal amount, e.g. "249.50". */
  amount: string;
  currencyCode: string;
  expireAfterSeconds: number;
}

export interface CreatePhonePeQrPaymentResult {
  providerOrderId: string;
  state: string;
  qrData: string;
  expiresAt: Date;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
}

// ========================================
// ? API RESPONSES
// ========================================
export interface PhonePeTokenResponse {
  access_token: string;
  token_type: string;
  expires_at: number;
}

export interface PhonePeCreatePaymentResponse {
  orderId: string;
  state: string;
  expireAt: number;
  qrData?: string;
}

export interface PhonePeErrorResponse {
  code?: string;
  message?: string;
}
