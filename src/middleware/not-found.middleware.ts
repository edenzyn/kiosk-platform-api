import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../shared/errors/app-error";

export const notFoundHandler: RequestHandler = (
  request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  next(
    new AppError(
      `Route ${request.method} ${request.originalUrl} was not found`,
      {
        statusCode: 404,
      },
    ),
  );
};
