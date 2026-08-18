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

  // ========================================
  // ? USER CLIENT APIS
  // ========================================
  loginUser = async (req: Request, res: Response): Promise<void> => {
    const data = await AuthValidator.login.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.authService.loginUser(data);

    setCookie(
      res,
      SecurityTokenEnums.USER_ACCESS_TOKEN,
      result.tokens.accessToken,
      ms(env.JWT_ACCESS_EXPIRES_IN as ms.StringValue),
      { httpOnly: false },
    );
    setCookie(
      res,
      SecurityTokenEnums.USER_REFRESH_TOKEN,
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
    const refreshToken = req.cookies[SecurityTokenEnums.USER_REFRESH_TOKEN];

    if (!refreshToken) {
      throw new AppError("Your session has expired. Please sign in again.", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    const result = await this.authService.refreshToken(refreshToken);

    if (result.clientType !== ClientTypeEnum.USER_CLIENT) {
      throw new AppError("Invalid session type.", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    setCookie(
      res,
      SecurityTokenEnums.USER_ACCESS_TOKEN,
      result.tokens.accessToken,
      ms(env.JWT_ACCESS_EXPIRES_IN as ms.StringValue),
      { httpOnly: false },
    );
    setCookie(
      res,
      SecurityTokenEnums.USER_REFRESH_TOKEN,
      result.tokens.refreshToken,
      ms(env.JWT_REFRESH_EXPIRES_IN as ms.StringValue),
    );

    res.json({
      user: result.user,
      permissions: result.permissions,
      availableScopes: result.availableScopes,
    });
  };

  logoutUser = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies[SecurityTokenEnums.USER_REFRESH_TOKEN];
    if (refreshToken) await this.authService.logout(refreshToken);

    clearCookie(res, SecurityTokenEnums.USER_ACCESS_TOKEN);
    clearCookie(res, SecurityTokenEnums.USER_REFRESH_TOKEN);
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
      SecurityTokenEnums.USER_ACCESS_TOKEN,
      result.tokens.accessToken,
      ms(env.JWT_ACCESS_EXPIRES_IN as ms.StringValue),
      { httpOnly: false },
    );
    setCookie(
      res,
      SecurityTokenEnums.USER_REFRESH_TOKEN,
      result.tokens.refreshToken,
      ms(env.JWT_REFRESH_EXPIRES_IN as ms.StringValue),
    );

    res.json({
      user: result.user,
      permissions: result.permissions,
      availableScopes: result.availableScopes,
    });
  };

  // Platform user apis
  loginPlatformUser = async (req: Request, res: Response): Promise<void> => {
    const data = await AuthValidator.login.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.authService.loginPlatformUser(data);

    setCookie(
      res,
      SecurityTokenEnums.USER_ACCESS_TOKEN,
      result.tokens.accessToken,
      ms(env.JWT_ACCESS_EXPIRES_IN as ms.StringValue),
      { httpOnly: false },
    );
    setCookie(
      res,
      SecurityTokenEnums.USER_REFRESH_TOKEN,
      result.tokens.refreshToken,
      ms(env.JWT_REFRESH_EXPIRES_IN as ms.StringValue),
    );

    res.json({
      user: result.user,
      permissions: result.permissions,
    });
  };

  // Reseller apis
  acceptResellerInvitation = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await AuthValidator.acceptResellerInvitation.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );
    const result = await this.authService.acceptResellerInvitation(data);

    setCookie(
      res,
      SecurityTokenEnums.USER_ACCESS_TOKEN,
      result.tokens.accessToken,
      ms(env.JWT_ACCESS_EXPIRES_IN as ms.StringValue),
      { httpOnly: false },
    );
    setCookie(
      res,
      SecurityTokenEnums.USER_REFRESH_TOKEN,
      result.tokens.refreshToken,
      ms(env.JWT_REFRESH_EXPIRES_IN as ms.StringValue),
    );

    res.json({
      user: result.user,
      permissions: result.permissions,
    });
  };

  // ========================================
  // ? DEVICE CLIENT APIS
  // ========================================
  loginDevice = async (req: Request, res: Response): Promise<void> => {
    const data = await AuthValidator.loginDevice.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.authService.loginDevice(data);

    setCookie(
      res,
      SecurityTokenEnums.DEVICE_ACCESS_TOKEN,
      result.tokens.accessToken,
      ms(env.JWT_DEVICE_ACCESS_EXPIRES_IN as ms.StringValue),
      { httpOnly: false },
    );

    setCookie(
      res,
      SecurityTokenEnums.DEVICE_REFRESH_TOKEN,
      result.tokens.refreshToken,
      ms(env.JWT_DEVICE_REFRESH_EXPIRES_IN as ms.StringValue),
    );

    res.status(HttpStatusCodes.OK).json({
      device: result.device,
      license: result.license,
    });
  };

  refreshDeviceToken = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies[SecurityTokenEnums.DEVICE_REFRESH_TOKEN];

    if (!refreshToken) {
      throw new AppError("Your session has expired. Please sign in again.", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    const result = await this.authService.refreshToken(refreshToken);

    if (result.clientType !== ClientTypeEnum.DEVICE_CLIENT) {
      throw new AppError("Invalid session type.", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    setCookie(
      res,
      SecurityTokenEnums.DEVICE_ACCESS_TOKEN,
      result.tokens.accessToken,
      ms(env.JWT_DEVICE_ACCESS_EXPIRES_IN as ms.StringValue),
      { httpOnly: false },
    );
    setCookie(
      res,
      SecurityTokenEnums.DEVICE_REFRESH_TOKEN,
      result.tokens.refreshToken,
      ms(env.JWT_DEVICE_REFRESH_EXPIRES_IN as ms.StringValue),
    );

    res.json({
      device: result.device,
      token: result.tokens.accessToken,
    });
  };

  logoutDevice = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies[SecurityTokenEnums.DEVICE_REFRESH_TOKEN];
    if (refreshToken) await this.authService.logout(refreshToken);

    clearCookie(res, SecurityTokenEnums.DEVICE_ACCESS_TOKEN);
    clearCookie(res, SecurityTokenEnums.DEVICE_REFRESH_TOKEN);
    res.status(HttpStatusCodes.NO_CONTENT).send();
  };
}
