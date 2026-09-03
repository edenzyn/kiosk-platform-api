// ========================================
// ? SERVICE TYPES
// ========================================
export interface UploadBrandLogoInput {
  fileType: string;
  contentType: string;
}
export interface UploadBrandLogoResult {
  logo: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface GenerateBrandLogoUrlResult {
  downloadUrl: string;
  expiresIn: number;
}
