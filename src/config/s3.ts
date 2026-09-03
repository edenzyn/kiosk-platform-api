import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";

export function createS3Client(): S3Client {
  return new S3Client({
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}
