import { env } from "../../config/env";
import type {
  GetDownloadUrlInput,
  GetDownloadUrlResult,
  GetUploadUrlInput,
  GetUploadUrlResult,
  HeadObjectResult,
  S3Provider,
  UploadObjectInput,
} from "../../shared/providers/s3/s3.provider";

export class FileRepository {
  constructor(private readonly s3Provider: S3Provider) {}

  private _buildKey(key: string): string {
    return `${env.S3_APP_FOLDER_PATH}/${key}`;
  }

  async uploadObject(input: UploadObjectInput): Promise<void> {
    return this.s3Provider.uploadObject({
      ...input,
      key: this._buildKey(input.key),
    });
  }

  async getUploadUrl(input: GetUploadUrlInput): Promise<GetUploadUrlResult> {
    return this.s3Provider.getUploadUrl({
      ...input,
      key: this._buildKey(input.key),
    });
  }

  async getDownloadUrl(
    input: GetDownloadUrlInput,
  ): Promise<GetDownloadUrlResult> {
    return this.s3Provider.getDownloadUrl({
      key: this._buildKey(input.key),
    });
  }

  async headObject(key: string): Promise<HeadObjectResult> {
    return this.s3Provider.headObject(this._buildKey(key));
  }

  async deleteObject(key: string): Promise<void> {
    return this.s3Provider.deleteObject(this._buildKey(key));
  }
}
