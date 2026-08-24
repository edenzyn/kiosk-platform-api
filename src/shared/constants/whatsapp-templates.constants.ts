export const WHATSAPP_TEMPLATES = {
  OTP: "kiosk_otp",
} as const;

const WHATSAPP_LANGUAGE_MAP = {
  en: "en_US",
  ml: "ml",
  ar: "ar",
  es: "es_ES",
} as const;

const DEFAULT_WHATSAPP_LANGUAGE_CODE = WHATSAPP_LANGUAGE_MAP.en;

export const resolveWhatsAppLanguageCode = (languageCode: string): string =>
  WHATSAPP_LANGUAGE_MAP[languageCode as keyof typeof WHATSAPP_LANGUAGE_MAP] ??
  DEFAULT_WHATSAPP_LANGUAGE_CODE;
