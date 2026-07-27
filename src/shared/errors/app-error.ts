export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly isOperational: boolean;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      details?: unknown;
      cause?: unknown;
      isOperational?: boolean;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_SERVER_ERROR";
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
  }
}
