import type { Request, Response } from "express";
import type { AuthService } from "./auth.service";
import { AuthValidator } from "./auth.validator";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const dto = AuthValidator.register.parse(req.body);
    const result = await this.authService.register(dto);
    res.status(201).json(result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const dto = AuthValidator.login.parse(req.body);
    const result = await this.authService.login(dto);
    res.json(result);
  };
}
