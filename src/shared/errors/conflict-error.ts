import { HttpStatusCodes } from "../constants/http-status-codes.constants";
import { ErrorCodes } from "../enums/core/error-codes.enum";
import { AppError } from "./app-error";

export class ConflictError extends AppError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown } = {},
  ) {
    super(message, {
      statusCode: HttpStatusCodes.CONFLICT,
      code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
      ...options,
    });
    this.name = "ConflictError";
  }
}
