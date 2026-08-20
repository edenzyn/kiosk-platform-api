import type { NextFunction, Request, Response } from "express";
import type jwt from "jsonwebtoken";
import { container } from "../config/container";
import { env } from "../config/env";
import { RedisKeys } from "../shared/constants/redis-keys.constants";
import { HttpStatusCodes } from "../shared/constants/http-status-codes.constants";
import type { DeviceTokenDto } from "../shared/dtos/device-token.dto";
import type { EffectiveTenant } from "../shared/dtos/effective-tenant.dto";
import type { UserRequestScope } from "../shared/dtos/user-request-scope.dto";
import type { UserTokenDto } from "../shared/dtos/user-token.dto";
import { ClientTypeEnum } from "../shared/enums/core/client-type.enum";
import { ErrorCodes } from "../shared/enums/core/error-codes.enum";
import { SecurityTokenEnums } from "../shared/enums/core/security-token-type.enum";
import { AppError } from "../shared/errors/app-error";
import type { RedisService } from "../shared/services/redis/redis.service";
import { logger } from "../shared/utils/core/logger";
import { verifyToken } from "../shared/utils/core/jwt.helper";

declare global {
  namespace Express {
    interface Request {
      user?: UserTokenDto;
      userScope?: UserRequestScope;
      effectiveTenant?: EffectiveTenant;
      device?: DeviceTokenDto;
      clientType?: ClientTypeEnum;
    }
  }
}

async function isSessionRevoked(sessionId: string): Promise<boolean> {
  try {
    const redisService = container.resolve<RedisService>("redisService");
    return await redisService.exists(RedisKeys.authSessionRevoked(sessionId));
  } catch (error) {
    // Fail open: if Redis is unreachable, fall back to the JWT's own expiry
    // rather than locking every signed-in user out because a cache is down.
    logger.error("[authMiddleware] Redis revocation check failed", error);
    return false;
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const apiPrefix = env.API_PREFIX_V1 || "/api/v1";
    const isDeviceRoute = req.originalUrl.startsWith(`${apiPrefix}/pvt/d`);

    let token: string | undefined;
    if (req.cookies) {
      token = isDeviceRoute
        ? req.cookies[SecurityTokenEnums.DEVICE_ACCESS_TOKEN]
        : req.cookies[SecurityTokenEnums.USER_ACCESS_TOKEN];
    }

    if (
      !token &&
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

    const decoded = verifyToken<
      jwt.JwtPayload & { user?: UserTokenDto; device?: DeviceTokenDto }
    >(token, env.JWT_ACCESS_SECRET);

    if (decoded.jti && (await isSessionRevoked(decoded.jti))) {
      throw new AppError("Invalid Session.", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    if (isDeviceRoute) {
      if (!decoded?.device?.id) {
        throw new AppError("Invalid Session.", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
          code: ErrorCodes.UNAUTHORIZED,
        });
      }
      req.device = decoded.device;
      req.clientType = ClientTypeEnum.DEVICE_CLIENT;
    } else {
      if (!decoded?.user?.id) {
        throw new AppError("Invalid Session.", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
          code: ErrorCodes.UNAUTHORIZED,
        });
      }
      req.user = { ...decoded.user, sessionId: decoded.jti };
      req.clientType = ClientTypeEnum.USER_CLIENT;
    }

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
