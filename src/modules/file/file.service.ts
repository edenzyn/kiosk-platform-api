import { randomUUID } from "node:crypto";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { AppError } from "../../shared/errors/app-error";
import { MenuImageTypeEnum } from "../../shared/enums/menu/menu-image-type.enum";
import type { FileRepository } from "./file.repository";
import type {
  CreateBrandLogoUploadUrlInput,
  CreateBrandLogoUploadUrlResult,
  CreateMenuImageUploadUrlInput,
  CreateMenuImageUploadUrlResult,
  FinalizeBrandLogoInput,
  FinalizeBrandLogoResult,
  FinalizeMenuImageInput,
  FinalizeMenuImageResult,
  GenerateBrandLogoUrlResult,
  GenerateMenuImageUrlResult,
  MenuImageRefInput,
} from "./file.types";

export class FileService {
  private readonly brandLogoPrefixPath = "brand-logos";
  private readonly menuImagePrefixPaths: Record<MenuImageTypeEnum, string> = {
    [MenuImageTypeEnum.ITEM]: "menu-item-images",
    [MenuImageTypeEnum.CATEGORY]: "menu-category-images",
  };

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

  // ========================================
  // ? MENU IMAGE (items & categories)
  // ========================================
  async createMenuImageUploadUrl(
    input: CreateMenuImageUploadUrlInput,
  ): Promise<CreateMenuImageUploadUrlResult> {
    const fileType = input.contentType.split("/")[1] || "png";
    const image = `${randomUUID()}.${fileType}`;

    const { uploadUrl, expiresIn } = await this.fileRepository.getUploadUrl({
      key: `${this.menuImagePrefixPaths[input.type]}/${image}`,
      contentType: input.contentType,
    });

    return { image, uploadUrl, expiresIn };
  }

  async finalizeMenuImage(
    input: FinalizeMenuImageInput,
  ): Promise<FinalizeMenuImageResult> {
    const { type, image, maxSizeBytes } = input;

    const { exists, contentLength } = await this.fileRepository.headObject(
      `${this.menuImagePrefixPaths[type]}/${image}`,
    );

    if (!exists) {
      throw new AppError("Uploaded image was not found in storage", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    if (contentLength > maxSizeBytes) {
      await this.deleteMenuImage({ type, image });
      throw new AppError("Image is too large", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    return { contentLength };
  }

  async generateMenuImageUrl(
    input: MenuImageRefInput,
  ): Promise<GenerateMenuImageUrlResult> {
    const { downloadUrl, expiresIn } = await this.fileRepository.getDownloadUrl(
      { key: `${this.menuImagePrefixPaths[input.type]}/${input.image}` },
    );

    return { imageUrl: downloadUrl, expiresIn };
  }

  async deleteMenuImage(input: MenuImageRefInput): Promise<void> {
    await this.fileRepository.deleteObject(
      `${this.menuImagePrefixPaths[input.type]}/${input.image}`,
    );
  }
}
