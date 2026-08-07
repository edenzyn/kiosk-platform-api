import type { NextFunction, Request, Response } from "express";
import type jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpStatusCodes } from "../shared/constants/http-status-codes.constants";
import type { UserRequestScope } from "../shared/dtos/user-request-scope.dto";
import type { UserTokenDto } from "../shared/dtos/user-token.dto";
import { ErrorCodes } from "../shared/enums/core/error-codes.enum";
import { SecurityTokenEnums } from "../shared/enums/core/security-token-type.enum";
import { AppError } from "../shared/errors/app-error";
import { verifyToken } from "../shared/utils/jwt.helper";

import type { EffectiveTenant } from "../shared/dtos/effective-tenant.dto";

declare global {
  namespace Express {
    interface Request {
      user?: UserTokenDto;
      userScope?: UserRequestScope;
      effectiveTenant?: EffectiveTenant;
    }
  }
}

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    let token: string | undefined;
    if (req.cookies && req.cookies[SecurityTokenEnums.ACCESS_TOKEN]) {
      token = req.cookies[SecurityTokenEnums.ACCESS_TOKEN];
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      throw new AppError("Invalid Session.", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    const decoded = verifyToken<jwt.JwtPayload & { user?: UserTokenDto }>(
      token,
      env.JWT_ACCESS_SECRET,
    );

    if (!decoded?.user?.id) {
      throw new AppError("Invalid Session.", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    req.user = decoded?.user;
    next();
  } catch (error) {
    next(
      new AppError("Invalid Session.", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
        details: error,
      }),
    );
  }
}
