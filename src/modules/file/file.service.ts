import { randomUUID } from "node:crypto";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { AppError } from "../../shared/errors/app-error";
import type { FileRepository } from "./file.repository";
import type {
  CreateBrandLogoUploadUrlInput,
  CreateBrandLogoUploadUrlResult,
  FinalizeBrandLogoInput,
  FinalizeBrandLogoResult,
  GenerateBrandLogoUrlResult,
} from "./file.types";

export class FileService {
  private readonly brandLogoPrefixPath = "brand-logos";

  constructor(private readonly fileRepository: FileRepository) {}

  // ========================================
  // ? BRAND LOGO
  // ========================================
  async createBrandLogoUploadUrl(
    input: CreateBrandLogoUploadUrlInput,
  ): Promise<CreateBrandLogoUploadUrlResult> {
    const fileType = input.contentType.split("/")[1] || "png";
    const logo = `${randomUUID()}.${fileType}`;

    const { uploadUrl, expiresIn } = await this.fileRepository.getUploadUrl({
      key: `${this.brandLogoPrefixPath}/${logo}`,
      contentType: input.contentType,
    });

    return { logo, uploadUrl, expiresIn };
  }

  async finalizeBrandLogo(
    input: FinalizeBrandLogoInput,
  ): Promise<FinalizeBrandLogoResult> {
    const { logo, maxSizeBytes } = input;

    const { exists, contentLength } = await this.fileRepository.headObject(
      `${this.brandLogoPrefixPath}/${logo}`,
    );

    if (!exists) {
      throw new AppError("Uploaded image was not found in storage", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    if (contentLength > maxSizeBytes) {
      await this.deleteBrandLogo(logo);
      throw new AppError("Image is too large", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return { contentLength };
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
