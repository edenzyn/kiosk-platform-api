// ========================================
// ? INPUTS & RESULTS
// ========================================
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
