declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

// whatsapp dtos
export interface VerifyWebhookQueryDto {
  "hub.mode": string;
  "hub.verify_token": string;
  "hub.challenge": string;
}

export interface WhatsAppTemplateButtonParam {
  index: number;
  param: string;
}

export interface SendWhatsAppMessageOptions {
  to: string;
  template: {
    name: string;
    languageCode: string;
    bodyParams: string[];
    buttons?: WhatsAppTemplateButtonParam[];
  };
}

export interface WhatsAppApiErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_data?: {
      messaging_product?: string;
      details?: string;
    };
    fbtrace_id?: string;
  };
}

export {};
