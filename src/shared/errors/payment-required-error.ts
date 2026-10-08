import { HttpStatusCodes } from "../constants/http-status-codes.constants";
import { AppError } from "./app-error";

export class PaymentRequiredError extends AppError {
  constructor(
    message: string,
    options: { code?: string; details?: unknown } = {},
  ) {
    super(message, {
      statusCode: HttpStatusCodes.PAYMENT_REQUIRED,
      ...options,
    });
    this.name = "PaymentRequiredError";
  }
}
