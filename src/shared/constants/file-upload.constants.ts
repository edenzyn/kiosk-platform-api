export const FILE_UPLOAD_CONFIG = {
  BRAND_LOGO: {
    acceptedTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  },
} as const;
