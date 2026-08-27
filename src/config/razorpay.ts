import Razorpay from "razorpay";
import { env } from "./env";

export function createRazorpayClient(): Razorpay {
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}
