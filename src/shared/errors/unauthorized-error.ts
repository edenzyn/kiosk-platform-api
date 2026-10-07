import { HttpStatusCodes } from "../constants/http-status-codes.constants";
import { ErrorCodes } from "../enums/core/error-codes.enum";
import { AppError } from "./app-error";

export class UnauthorizedError extends AppError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown } = {},
  ) {
    super(message, {
      statusCode: HttpStatusCodes.UNAUTHORIZED,
      code: ErrorCodes.UNAUTHORIZED,
      ...options,
    });
    this.name = "UnauthorizedError";
  }
}
