import { randomUUID } from "node:crypto";
import type { FileRepository } from "./file.repository";
import type {
  GenerateBrandLogoUrlResult,
  UploadBrandLogoInput,
  UploadBrandLogoResult,
} from "./file.types";

export class FileService {
  private readonly brandLogoPrefixPath = "brand-logos";

  constructor(private readonly fileRepository: FileRepository) {}

  // ========================================
  // ? BRAND LOGO
  // ========================================
  async uploadBrandLogo(
    input: UploadBrandLogoInput,
  ): Promise<UploadBrandLogoResult> {
    const fileType = input.contentType.split("/")[1] || "png";
    const logo = `${randomUUID()}.${fileType}`;

    await this.fileRepository.uploadObject({
      key: `${this.brandLogoPrefixPath}/${logo}`,
      body: input.body,
      contentType: input.contentType,
    });

    return { logo };
  }

  async generateBrandLogoUrl(
    logo: string,
  ): Promise<GenerateBrandLogoUrlResult> {
    const { downloadUrl, expiresIn } = await this.fileRepository.getDownloadUrl(
      {
        key: `${this.brandLogoPrefixPath}/${logo}`,
      },
    );

    return { brandLogoUrl: downloadUrl, expiresIn };
  }

  async deleteBrandLogo(logo: string): Promise<void> {
    await this.fileRepository.deleteObject(
      `${this.brandLogoPrefixPath}/${logo}`,
    );
  }
}
