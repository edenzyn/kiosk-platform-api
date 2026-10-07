import type { NextFunction, Request, RequestHandler, Response } from "express";
import { NotFoundError } from "../shared/errors/not-found-error";

export const notFoundHandler: RequestHandler = (
  _request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  next(new NotFoundError("Resource not found"));
};
