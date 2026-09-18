import type { MenuImageTypeEnum } from "../../shared/enums/menu/menu-image-type.enum";

// ========================================
// ? SERVICE TYPES
// ========================================
export interface CreateBrandLogoUploadUrlInput {
  contentType: string;
}
export interface CreateBrandLogoUploadUrlResult {
  logo: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface FinalizeBrandLogoInput {
  logo: string;
  maxSizeBytes: number;
}
export interface FinalizeBrandLogoResult {
  contentLength: number;
}

export interface GenerateBrandLogoUrlResult {
  brandLogoUrl: string;
  expiresIn: number;
}

export interface CreateMenuImageUploadUrlInput {
  type: MenuImageTypeEnum;
  contentType: string;
}
export interface CreateMenuImageUploadUrlResult {
  image: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface FinalizeMenuImageInput {
  type: MenuImageTypeEnum;
  image: string;
  maxSizeBytes: number;
}
export interface FinalizeMenuImageResult {
  contentLength: number;
}

export interface MenuImageRefInput {
  type: MenuImageTypeEnum;
  image: string;
}
export interface GenerateMenuImageUrlResult {
  imageUrl: string;
  expiresIn: number;
}
