import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../../config/env";
import { ErrorCodes } from "../../enums/core/error-codes.enum";
import { ServiceUnavailableError } from "../../errors/service-unavailable-error";

export interface UploadObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface GetUploadUrlInput {
  key: string;
  contentType: string;
}

export interface GetUploadUrlResult {
  uploadUrl: string;
  expiresIn: number;
}

export interface GetDownloadUrlInput {
  key: string;
}

export interface GetDownloadUrlResult {
  downloadUrl: string;
  expiresIn: number;
}

export interface HeadObjectResult {
  exists: boolean;
  contentLength: number;
}

export class S3Provider {
  constructor(private readonly s3Client: S3Client) {}

  async uploadObject(input: UploadObjectInput): Promise<void> {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
        }),
      );
    } catch (error) {
      throw new ServiceUnavailableError("Failed to upload file to storage", {
        code: ErrorCodes.STORAGE_PROVIDER_ERROR,
        details: error,
      });
    }
  }

  async getUploadUrl(input: GetUploadUrlInput): Promise<GetUploadUrlResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: input.key,
        ContentType: input.contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: env.S3_PRESIGNED_URL_EXPIRES_IN_SECONDS,
      });

      return {
        uploadUrl,
        expiresIn: env.S3_PRESIGNED_URL_EXPIRES_IN_SECONDS,
      };
    } catch (error) {
      throw new ServiceUnavailableError("Failed to generate upload URL", {
        code: ErrorCodes.STORAGE_PROVIDER_ERROR,
        details: error,
      });
    }
  }

  async getDownloadUrl(
    input: GetDownloadUrlInput,
  ): Promise<GetDownloadUrlResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: input.key,
      });

      const downloadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: env.S3_PRESIGNED_URL_EXPIRES_IN_SECONDS,
      });

      return {
        downloadUrl,
        expiresIn: env.S3_PRESIGNED_URL_EXPIRES_IN_SECONDS,
      };
    } catch (error) {
      throw new ServiceUnavailableError("Failed to generate download URL", {
        code: ErrorCodes.STORAGE_PROVIDER_ERROR,
        details: error,
      });
    }
  }

  async headObject(key: string): Promise<HeadObjectResult> {
    try {
      const result = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
        }),
      );

      return {
        exists: true,
        contentLength: result.ContentLength ?? 0,
      };
    } catch (error) {
      if (error instanceof NotFound) {
        return { exists: false, contentLength: 0 };
      }

      throw new ServiceUnavailableError("Failed to verify uploaded file", {
        code: ErrorCodes.STORAGE_PROVIDER_ERROR,
        details: error,
      });
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
        }),
      );
    } catch (error) {
      throw new ServiceUnavailableError("Failed to delete file from storage", {
        code: ErrorCodes.STORAGE_PROVIDER_ERROR,
        details: error,
      });
    }
  }
}
