export const FILE_UPLOAD_CONFIG = {
  BRAND_LOGO: {
    acceptedTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  MENU_IMAGE: {
    acceptedTypes: ["image/png", "image/jpeg", "image/webp"],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
} as const;
