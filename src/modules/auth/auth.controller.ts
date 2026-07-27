import type { Request, Response } from "express";
import type { AuthService } from "./auth.service";
import { AuthValidator } from "./auth.validator";
import { setCookie } from "../../shared/utils/cookie.helper";
import { env } from "../../config/env";
import { SecurityTokenEnums } from "../../shared/enums/core/SecurityTokenType";
import ms from "ms";

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
    
    setCookie(res, SecurityTokenEnums.ACCESS_TOKEN, result.tokens.accessToken, ms(env.JWT_ACCESS_EXPIRES_IN as ms.StringValue), { httpOnly: false });
    setCookie(res, SecurityTokenEnums.REFRESH_TOKEN, result.tokens.refreshToken, ms(env.JWT_REFRESH_EXPIRES_IN as ms.StringValue));

    
    res.json({ user: result.user });
  };
}
