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

// ========================================
// ? WEBHOOKS
// ========================================
export interface PhonePeWebhookSplitInstrument {
  amount: number;
  rail?: {
    type: string;
    upiTransactionId?: string;
    vpa?: string;
  };
  instrument?: {
    type: string;
    accountType?: string;
    accountNumber?: string;
  };
}

export interface PhonePeWebhookPaymentDetail {
  paymentMode: string;
  transactionId: string;
  timestamp: number;
  amount: number;
  state: string;
  errorCode?: string;
  detailedErrorCode?: string;
  splitInstruments?: PhonePeWebhookSplitInstrument[];
}

export interface PhonePeWebhookPayload {
  event: string;
  payload: {
    orderId: string;
    merchantId: string;
    merchantOrderId: string;
    state: string;
    amount: number;
    expireAt: number;
    metaInfo?: Record<string, string>;
    paymentDetails?: PhonePeWebhookPaymentDetail[];
  };
}
