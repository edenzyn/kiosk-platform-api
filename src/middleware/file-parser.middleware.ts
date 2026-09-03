import express, { type RequestHandler } from "express";

export interface FileParserOptions {
  acceptedTypes: readonly string[];
  maxSizeBytes: number;
}

export const fileParserMiddleware = ({
  acceptedTypes,
  maxSizeBytes,
}: FileParserOptions): RequestHandler => {
  return express.raw({
    type: acceptedTypes as string[],
    limit: maxSizeBytes,
  });
};
