import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import ERROR_MESSAGES from "../shared/constants/error-messages.constants";
import { HttpStatusCodes } from "../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../shared/enums/core/error-codes.enum";
import { AppError } from "../shared/errors/app-error";

export const rateLimitMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction): void => {
    next(
      new AppError(ERROR_MESSAGES.RATE_LIMIT, {
        statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
        code: ErrorCodes.TOO_MANY_REQUESTS,
      }),
    );
  },
});
