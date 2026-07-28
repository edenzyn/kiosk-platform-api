import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { AppError } from "../shared/errors/app-error";
import { logger } from "../shared/utils/logger";
import { ErrorCodes } from "../shared/enums/core/ErrorCodes";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
): void => {
  if (env.NODE_ENV === "development") console.log(error);
  const normalized =
    error instanceof ZodError
      ? new AppError("Request validation failed", {
          statusCode: 400,
          code: ErrorCodes.VALIDATION_ERROR,
          details: error.flatten(),
        })
      : error instanceof AppError
        ? error
        : new AppError("An unexpected error occurred", {
            isOperational: false,
          });

  const context = {
    err: error,
    code: normalized.code,
  };
  if (normalized.statusCode >= 500) {
    logger.error(normalized.message, context);
  } else {
    logger.warn(normalized.message, context);
  }

  response.status(normalized.statusCode).json({
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details !== undefined && {
        details: normalized.details,
      }),
      ...(env.NODE_ENV !== "production" && {
        cause: error instanceof Error ? error.message : String(error),
      }),
    },
  });
};
