import type { NextFunction, Request, Response } from "express";
import type jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpStatusCodes } from "../shared/constants/http-status-codes.constants";
import type { DeviceStaffTokenDto } from "../shared/dtos/device-staff-token.dto";
import { CustomRequestHeaders } from "../shared/enums/core/custom-request-headers.enum";
import { ErrorCodes } from "../shared/enums/core/error-codes.enum";
import { AppError } from "../shared/errors/app-error";
import { verifyToken } from "../shared/utils/core/jwt.helper";
import { isSessionRevoked } from "./auth.middleware";

export async function verifyDeviceStaffToken(
  req: Request,
): Promise<DeviceStaffTokenDto> {
  try {
    const token = req.get(CustomRequestHeaders.DEVICE_STAFF_TOKEN);
    if (!token) throw new Error("Missing device staff token");

    const decoded = verifyToken<
      jwt.JwtPayload & { deviceStaff?: DeviceStaffTokenDto }
    >(token, env.JWT_ACCESS_SECRET);

    if (
      !decoded.deviceStaff?.userId ||
      decoded.deviceStaff.deviceId !== req.device?.id
    ) {
      throw new Error("Invalid device staff token");
    }

    if (await isSessionRevoked(decoded.deviceStaff.sessionId)) {
      throw new Error("Revoked device staff session");
    }

    return decoded.deviceStaff;
  } catch {
    throw new AppError("Your staff session has ended. Sign in again.", {
      statusCode: HttpStatusCodes.FORBIDDEN,
      code: ErrorCodes.DEVICE_STAFF_SESSION_EXPIRED,
    });
  }
}

export async function deviceStaffMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    req.deviceStaff = await verifyDeviceStaffToken(req);
    next();
  } catch (error) {
    next(error);
  }
}
