// ========================================
// ? SERVICE TYPES
// ========================================
export interface UploadBrandLogoInput {
  contentType: string;
  body: Buffer;
}
export interface UploadBrandLogoResult {
  logo: string;
}

export interface GenerateBrandLogoUrlResult {
  brandLogoUrl: string;
  expiresIn: number;
}
