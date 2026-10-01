import { parseCookie } from "cookie";
import type jwt from "jsonwebtoken";
import type { ExtendedError } from "socket.io";
import { env } from "../config/env";
import type { DeviceTokenDto } from "../shared/dtos/device-token.dto";
import { SecurityTokenEnums } from "../shared/enums/core/security-token-type.enum";
import type { DeviceSocket } from "../shared/providers/realtime/realtime.types";
import { verifyToken } from "../shared/utils/core/jwt.helper";
import { isSessionRevoked } from "./auth.middleware";

export async function deviceSocketAuthMiddleware(
  socket: DeviceSocket,
  next: (error?: ExtendedError) => void,
): Promise<void> {
  try {
    const cookies = parseCookie(socket.handshake.headers.cookie ?? "");
    const token =
      cookies[SecurityTokenEnums.DEVICE_ACCESS_TOKEN] ??
      (socket.handshake.auth.token as string | undefined);

    if (!token) throw new Error("Missing device token");

    const decoded = verifyToken<jwt.JwtPayload & { device?: DeviceTokenDto }>(
      token,
      env.JWT_ACCESS_SECRET,
    );

    if (!decoded.device?.id) throw new Error("Not a device token");
    if (decoded.jti && (await isSessionRevoked(decoded.jti))) {
      throw new Error("Session revoked");
    }

    socket.data.device = decoded.device;
    next();
  } catch {
    next(new Error("Invalid Session."));
  }
}
