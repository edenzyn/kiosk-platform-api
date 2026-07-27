import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../shared/utils/jwt.helper";
import { env } from "../config/env";
import { AppError } from "../shared/errors/app-error";
import { SecurityTokenEnums } from "../shared/enums/core/SecurityTokenType";
import type jwt from "jsonwebtoken";
import type { UserTokenDto } from "../shared/dtos/user-token.dto";

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
      console.log("from cookie");
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
      console.log("from header");
    }

    if (!token) {
      throw new AppError("Authentication token is missing", {
        statusCode: 401,
        code: "UNAUTHORIZED",
      });
    }

    const decoded = verifyToken<jwt.JwtPayload & { id?: string }>(
      token,
      env.JWT_ACCESS_SECRET,
    );
    console.log({ decoded });

    const userId = decoded.id;

    if (!userId) {
      throw new AppError("Invalid token payload", {
        statusCode: 401,
        code: "UNAUTHORIZED",
      });
    }

    req.user = { id: userId };
    next();
  } catch (error) {
    next(
      new AppError("Invalid or expired token", {
        statusCode: 401,
        code: "UNAUTHORIZED",
      }),
    );
  }
}
