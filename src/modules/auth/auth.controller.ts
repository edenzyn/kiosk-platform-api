import type { Request, Response } from "express";
import ms from "ms";
import { env } from "../../config/env";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ClientTypeEnum } from "../../shared/enums/core/client-type.enum";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { SecurityTokenEnums } from "../../shared/enums/core/security-token-type.enum";
import { AppError } from "../../shared/errors/app-error";
import { clearCookie, setCookie } from "../../shared/utils/core/cookie.helper";
import type { AuthService } from "./auth.service";
import { AuthValidator } from "./auth.validator";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  loginUser = async (req: Request, res: Response): Promise<void> => {
    const data = await AuthValidator.login.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.authService.loginUser(data);

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

    res.json({
      user: result.user,
      permissions: result.permissions,
      availableScopes: result.availableScopes,
    });
  };

  refreshUserToken = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies[SecurityTokenEnums.REFRESH_TOKEN];

    if (!refreshToken) {
      throw new AppError("Your session has expired. Please sign in again.", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    const result = await this.authService.refreshUserToken(refreshToken);

    if (req.clientType === ClientTypeEnum.DEVICE_CLIENT) {
      setCookie(
        res,
        SecurityTokenEnums.ACCESS_TOKEN,
        result.tokens.accessToken,
        ms(env.JWT_DEVICE_ACCESS_EXPIRES_IN as ms.StringValue),
        { httpOnly: false },
      );
      setCookie(
        res,
        SecurityTokenEnums.REFRESH_TOKEN,
        result.tokens.refreshToken,
        ms(env.JWT_DEVICE_REFRESH_EXPIRES_IN as ms.StringValue),
      );

      res.json({
        device: result.device,
        token: result.tokens.accessToken,
      });
    } else {
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

      res.json({
        user: result.user,
        permissions: result.permissions,
        availableScopes: result.availableScopes,
      });
    }
  };

  logoutUser = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies[SecurityTokenEnums.REFRESH_TOKEN];
    if (refreshToken) await this.authService.logoutUser(refreshToken);

    clearCookie(res, SecurityTokenEnums.ACCESS_TOKEN);
    clearCookie(res, SecurityTokenEnums.REFRESH_TOKEN);
    res.status(HttpStatusCodes.NO_CONTENT).send();
  };

  acceptInvitation = async (req: Request, res: Response): Promise<void> => {
    const data = await AuthValidator.acceptInvitation.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.authService.acceptInvitation(data);

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

    res.json({
      user: result.user,
      permissions: result.permissions,
      availableScopes: result.availableScopes,
    });
  };

  loginDevice = async (req: Request, res: Response): Promise<void> => {
    const data = await AuthValidator.loginDevice.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.authService.loginDevice(data);

    setCookie(
      res,
      SecurityTokenEnums.ACCESS_TOKEN,
      result.tokens.accessToken,
      ms(env.JWT_DEVICE_ACCESS_EXPIRES_IN as ms.StringValue),
      { httpOnly: false },
    );

    setCookie(
      res,
      SecurityTokenEnums.REFRESH_TOKEN,
      result.tokens.refreshToken,
      ms(env.JWT_DEVICE_REFRESH_EXPIRES_IN as ms.StringValue),
    );

    res.status(HttpStatusCodes.OK).json({
      device: result.device,
    });
  };
}
