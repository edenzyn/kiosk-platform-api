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
