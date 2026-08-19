import { authenticator } from "otplib";
import { env } from "../../../config/env";
import type { QrCodeService } from "../qrcode/qrcode.service";

export class TotpService {
  constructor(private readonly qrCodeService: QrCodeService) {}

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  buildKeyUri(email: string, secret: string): string {
    return authenticator.keyuri(email, env.APP_NAME, secret);
  }

  async generateQrCodeDataUrl(keyUri: string): Promise<string> {
    return this.qrCodeService.generateDataUrl(keyUri);
  }

  verify(code: string, secret: string): boolean {
    try {
      return authenticator.verify({ token: code.trim(), secret });
    } catch {
      return false;
    }
  }
}
