import { authenticator } from "otplib";
import { env } from "../../../config/env";
import type { QrCodeProvider } from "../qrcode/qrcode.provider";

export class TotpProvider {
  constructor(private readonly qrCodeProvider: QrCodeProvider) {}

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  buildKeyUri(email: string, secret: string): string {
    return authenticator.keyuri(email, env.APP_NAME, secret);
  }

  async generateQrCodeDataUrl(keyUri: string): Promise<string> {
    return this.qrCodeProvider.generateDataUrl(keyUri);
  }

  verify(code: string, secret: string): boolean {
    try {
      return authenticator.verify({ token: code.trim(), secret });
    } catch {
      return false;
    }
  }
}
