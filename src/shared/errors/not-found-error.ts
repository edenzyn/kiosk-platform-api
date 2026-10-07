import { HttpStatusCodes } from "../constants/http-status-codes.constants";
import { ErrorCodes } from "../enums/core/error-codes.enum";
import { AppError } from "./app-error";

export class NotFoundError extends AppError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown } = {},
  ) {
    super(message, {
      statusCode: HttpStatusCodes.NOT_FOUND,
      code: ErrorCodes.RESOURCE_NOT_FOUND,
      ...options,
    });
    this.name = "NotFoundError";
  }
}
