import type { NextFunction, Request, Response } from "express";
import type jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpStatusCodes } from "../shared/constants/http-status-codes.constants";
import type { DeviceAdminTokenDto } from "../shared/dtos/device-admin-token.dto";
import { CustomRequestHeaders } from "../shared/enums/core/custom-request-headers.enum";
import { ErrorCodes } from "../shared/enums/core/error-codes.enum";
import { AppError } from "../shared/errors/app-error";
import { verifyToken } from "../shared/utils/core/jwt.helper";

export function deviceAdminMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const token = req.get(CustomRequestHeaders.DEVICE_ADMIN_TOKEN);
    if (!token) throw new Error("Missing device admin token");

    const decoded = verifyToken<
      jwt.JwtPayload & { deviceAdmin?: DeviceAdminTokenDto }
    >(token, env.JWT_ACCESS_SECRET);

    if (
      !decoded.deviceAdmin?.userId ||
      decoded.deviceAdmin.deviceId !== req.device?.id
    ) {
      throw new Error("Invalid device admin token");
    }

    req.deviceAdmin = decoded.deviceAdmin;
    next();
  } catch {
    next(
      new AppError("Your admin session has ended. Sign in again.", {
        statusCode: HttpStatusCodes.FORBIDDEN,
        code: ErrorCodes.DEVICE_ADMIN_SESSION_EXPIRED,
      }),
    );
  }
}
