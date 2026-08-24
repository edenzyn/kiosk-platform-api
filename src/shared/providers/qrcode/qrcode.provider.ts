import QRCode from "qrcode";

export class QrCodeProvider {
  async generateDataUrl(data: string): Promise<string> {
    return QRCode.toDataURL(data);
  }
}
