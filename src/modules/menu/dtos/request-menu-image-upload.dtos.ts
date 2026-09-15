export interface RequestMenuImageUploadBodyDto {
  contentType: string;
  fileSize: number;
}

export interface RequestMenuImageUploadResponseDto {
  image: string;
  uploadUrl: string;
  expiresIn: number;
}
