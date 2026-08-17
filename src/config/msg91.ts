import { env } from "./env";

export interface Msg91Config {
  baseUrl: string;
  authKey: string;
  senderId: string;
  otpTemplateId: string;
}

export const msg91Config: Msg91Config = {
  baseUrl: env.MSG91_BASE_URL,
  authKey: env.MSG91_AUTH_KEY,
  senderId: env.MSG91_SENDER_ID,
  otpTemplateId: env.MSG91_OTP_TEMPLATE_ID,
};
