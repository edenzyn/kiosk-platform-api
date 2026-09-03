import type {
  GetDownloadUrlInput,
  GetDownloadUrlResult,
  GetUploadUrlInput,
  GetUploadUrlResult,
  S3Provider,
} from "../../shared/providers/s3/s3.provider";

export class FileRepository {
  constructor(private readonly s3Provider: S3Provider) {}

  async getUploadUrl(input: GetUploadUrlInput): Promise<GetUploadUrlResult> {
    return this.s3Provider.getUploadUrl(input);
  }

  async getDownloadUrl(
    input: GetDownloadUrlInput,
  ): Promise<GetDownloadUrlResult> {
    return this.s3Provider.getDownloadUrl(input);
  }

  async deleteObject(key: string): Promise<void> {
    return this.s3Provider.deleteObject(key);
  }
}
