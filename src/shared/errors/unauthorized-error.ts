import { HttpStatusCodes } from "../constants/http-status-codes.constants";
import { AppError } from "./app-error";

export class UnauthorizedError extends AppError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown } = {},
  ) {
    super(message, { statusCode: HttpStatusCodes.UNAUTHORIZED, ...options });
    this.name = "UnauthorizedError";
  }
}
