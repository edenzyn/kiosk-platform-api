import { HttpStatusCodes } from "../constants/http-status-codes.constants";
import { ErrorCodes } from "../enums/core/error-codes.enum";
import { AppError } from "./app-error";

export class TooManyRequestsError extends AppError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown } = {},
  ) {
    super(message, {
      statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
      code: ErrorCodes.TOO_MANY_REQUESTS,
      ...options,
    });
    this.name = "TooManyRequestsError";
  }
}
