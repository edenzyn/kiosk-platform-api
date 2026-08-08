import type { NextFunction, Request, Response } from "express";
import { logger } from "../shared/utils/core/logger";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.log(
      `[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`,
    );
  });

  next();
}
