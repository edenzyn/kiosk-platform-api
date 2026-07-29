import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../shared/utils/jwt.helper";
import { env } from "../config/env";
import { AppError } from "../shared/errors/app-error";
import type jwt from "jsonwebtoken";
import type { UserTokenDto } from "../shared/dtos/user-token.dto";
import { HttpStatusCodes } from "../shared/constants/http-status-codes.constants";
import { SecurityTokenEnums } from "../shared/enums/core/security-token-type.enum";
import { ErrorCodes } from "../shared/enums/core/error-codes.enum";

declare global {
  namespace Express {
    interface Request {
      user?: UserTokenDto;
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
      throw new AppError("Authentication token is missing", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    const decoded = verifyToken<jwt.JwtPayload & { user?: UserTokenDto }>(
      token,
      env.JWT_ACCESS_SECRET,
    );

    if (!decoded?.user?.id) {
      throw new AppError("Invalid token payload", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    req.user = decoded?.user;
    next();
  } catch (error) {
    next(
      new AppError("Invalid or expired token", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      }),
    );
  }
}
