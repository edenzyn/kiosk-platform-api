declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export interface VerifyWebhookQueryDto {
  "hub.mode": string;
  "hub.verify_token": string;
  "hub.challenge": string;
}

export {};
