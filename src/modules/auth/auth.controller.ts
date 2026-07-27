import type { RequestHandler } from "express";
import type { AuthService } from "./auth.service";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  readonly status: RequestHandler = (_request, response): void => {
    response.json(this.authService.getStatus());
  };
}
