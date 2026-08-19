import QRCode from "qrcode";

export class QrCodeService {
  async generateDataUrl(data: string): Promise<string> {
    return QRCode.toDataURL(data);
  }
}
