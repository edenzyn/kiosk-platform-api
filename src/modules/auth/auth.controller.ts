import type { Request, Response } from "express";
import type { AuthService } from "./auth.service";
import { AuthValidator } from "./auth.validator";
import { clearCookie, setCookie } from "../../shared/utils/cookie.helper";
import { env } from "../../config/env";
import { SecurityTokenEnums } from "../../shared/enums/core/security-token-type.enum";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import ms from "ms";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { AppError } from "../../shared/errors/app-error";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const data = await AuthValidator.register.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.authService.register(data);
    res.status(HttpStatusCodes.CREATED).json(result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const data = await AuthValidator.login.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.authService.login(data);

    setCookie(
      res,
      SecurityTokenEnums.ACCESS_TOKEN,
      result.tokens.accessToken,
      ms(env.JWT_ACCESS_EXPIRES_IN as ms.StringValue),
      { httpOnly: false },
    );
    setCookie(
      res,
      SecurityTokenEnums.REFRESH_TOKEN,
      result.tokens.refreshToken,
      ms(env.JWT_REFRESH_EXPIRES_IN as ms.StringValue),
    );

    res.json({ user: result.user });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies[SecurityTokenEnums.REFRESH_TOKEN];

    if (!refreshToken) {
      throw new AppError("No refresh token provided", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    const result = await this.authService.refresh(refreshToken);

    setCookie(
      res,
      SecurityTokenEnums.ACCESS_TOKEN,
      result.tokens.accessToken,
      ms(env.JWT_ACCESS_EXPIRES_IN as ms.StringValue),
      { httpOnly: false },
    );
    setCookie(
      res,
      SecurityTokenEnums.REFRESH_TOKEN,
      result.tokens.refreshToken,
      ms(env.JWT_REFRESH_EXPIRES_IN as ms.StringValue),
    );

    res.json({ user: result.user });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies[SecurityTokenEnums.REFRESH_TOKEN];
    if (refreshToken) await this.authService.logout(refreshToken);

    clearCookie(res, SecurityTokenEnums.ACCESS_TOKEN);
    clearCookie(res, SecurityTokenEnums.REFRESH_TOKEN);
    res.status(HttpStatusCodes.NO_CONTENT).send();
  };
}
