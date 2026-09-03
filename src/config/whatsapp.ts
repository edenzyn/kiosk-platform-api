import { env } from "./env";

export interface WhatsAppClientConfig {
  apiBaseUrl: string;
  apiVersion: string;
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string;
}

export const whatsappClientConfig: WhatsAppClientConfig = {
  apiBaseUrl: env.META_WHATSAPP_API_BASE_URL,
  apiVersion: env.META_WHATSAPP_API_VERSION,
  phoneNumberId: env.META_WHATSAPP_PHONE_NUMBER_ID,
  accessToken: env.META_WHATSAPP_ACCESS_TOKEN,
  verifyToken: env.META_WHATSAPP_VERIFY_TOKEN,
  appSecret: env.META_WHATSAPP_APP_SECRET,
};
