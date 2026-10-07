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
import { DatabaseError } from "../../shared/errors/database-error";
import { logger } from "../../shared/utils/core/logger";

export class FileRepository {
  constructor(private readonly s3Provider: S3Provider) {}

  private _buildKey(key: string): string {
    try {
      return `${env.S3_APP_FOLDER_PATH}/${key}`;
    } catch (error) {
      logger.error("[FILE__BUILD_KEY_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async uploadObject(input: UploadObjectInput): Promise<void> {
    try {
      return await this.s3Provider.uploadObject({
        ...input,
        key: this._buildKey(input.key),
      });
    } catch (error) {
      logger.error("[FILE_UPLOAD_OBJECT_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async getUploadUrl(input: GetUploadUrlInput): Promise<GetUploadUrlResult> {
    try {
      return await this.s3Provider.getUploadUrl({
        ...input,
        key: this._buildKey(input.key),
      });
    } catch (error) {
      logger.error("[FILE_GET_UPLOAD_URL_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async getDownloadUrl(
    input: GetDownloadUrlInput,
  ): Promise<GetDownloadUrlResult> {
    try {
      return await this.s3Provider.getDownloadUrl({
        key: this._buildKey(input.key),
      });
    } catch (error) {
      logger.error("[FILE_GET_DOWNLOAD_URL_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async headObject(key: string): Promise<HeadObjectResult> {
    try {
      return await this.s3Provider.headObject(this._buildKey(key));
    } catch (error) {
      logger.error("[FILE_HEAD_OBJECT_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      return await this.s3Provider.deleteObject(this._buildKey(key));
    } catch (error) {
      logger.error("[FILE_DELETE_OBJECT_ERROR] " + error);
      throw new DatabaseError(`${error}`);
    }
  }
}
