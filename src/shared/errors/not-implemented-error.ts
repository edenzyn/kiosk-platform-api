import { HttpStatusCodes } from "../constants/http-status-codes.constants";
import { ErrorCodes } from "../enums/core/error-codes.enum";
import { AppError } from "./app-error";

export class NotImplementedError extends AppError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown } = {},
  ) {
    super(message, {
      statusCode: HttpStatusCodes.NOT_IMPLEMENTED,
      code: ErrorCodes.NOT_IMPLEMENTED,
      ...options,
    });
    this.name = "NotImplementedError";
  }
}
