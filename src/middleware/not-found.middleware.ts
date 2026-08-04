import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../shared/errors/app-error";

export const notFoundHandler: RequestHandler = (
  _request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  next(
    new AppError("Resource not found", {
      statusCode: 404,
    }),
  );
};
