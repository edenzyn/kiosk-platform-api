import { HttpStatusCodes } from "../constants/http-status-codes.constants";
import { AppError } from "./app-error";

export class InternalServerError extends AppError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown } = {},
  ) {
    super(message, {
      statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ...options,
    });
    this.name = "InternalServerError";
  }
}
