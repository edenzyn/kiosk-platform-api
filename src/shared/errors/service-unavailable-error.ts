import { HttpStatusCodes } from "../constants/http-status-codes.constants";
import { AppError } from "./app-error";

export class ServiceUnavailableError extends AppError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown } = {},
  ) {
    super(message, {
      statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE,
      ...options,
    });
    this.name = "ServiceUnavailableError";
  }
}
