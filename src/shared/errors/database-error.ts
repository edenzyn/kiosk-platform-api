import { HttpStatusCodes } from "../constants/http-status-codes.constants";
import { ErrorCodes } from "../enums/core/error-codes.enum";
import { AppError } from "./app-error";

export class DatabaseError extends AppError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown } = {},
  ) {
    super(message, {
      statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
      code: ErrorCodes.DATABASE_ERROR,
      ...options,
    });
    this.name = "DatabaseError";
  }
}
