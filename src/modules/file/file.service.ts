import { randomUUID } from "node:crypto";
import type { FileRepository } from "./file.repository";
import type {
  GenerateBrandLogoUrlResult,
  UploadBrandLogoInput,
  UploadBrandLogoResult,
} from "./file.types";

export class FileService {
  private readonly brandLogo = "brand-logos";

  constructor(private readonly fileRepository: FileRepository) {}

  // ========================================
  // ? BRAND LOGO
  // ========================================
  async uploadBrandLogo(
    input: UploadBrandLogoInput,
  ): Promise<UploadBrandLogoResult> {
    const logo = `${randomUUID()}.${input.fileType}`;

    const { uploadUrl, expiresIn } = await this.fileRepository.getUploadUrl({
      key: `${this.brandLogo}/${logo}`,
      contentType: input.contentType,
    });

    return { logo, uploadUrl, expiresIn };
  }

  async generateBrandLogoUrl(
    logo: string,
  ): Promise<GenerateBrandLogoUrlResult> {
    return this.fileRepository.getDownloadUrl({
      key: `${this.brandLogo}/${logo}`,
    });
  }

  async deleteBrandLogo(logo: string): Promise<void> {
    await this.fileRepository.deleteObject(`${this.brandLogo}/${logo}`);
  }
}
