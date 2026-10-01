import { container } from "../config/container";
import type { SocketConnection } from "../config/socket";
import { deviceSocketAuthMiddleware } from "../middleware/socket-auth.middleware";
import {
  DEVICE_SOCKET_NAMESPACE,
  RealtimeRooms,
} from "../shared/providers/realtime/realtime.constants";
import type { DeviceSocket } from "../shared/providers/realtime/realtime.types";
import { logger } from "../shared/utils/core/logger";

export function registerSocketHandlers(): void {
  const { server } = container.resolve<SocketConnection>("socket");
  const deviceNamespace = server.of(DEVICE_SOCKET_NAMESPACE);

  deviceNamespace.use(deviceSocketAuthMiddleware);

  deviceNamespace.on("connection", (socket: DeviceSocket) => {
    const { device } = socket.data;

    void socket.join([
      RealtimeRooms.device(device.id),
      RealtimeRooms.branch(device.branchId),
      RealtimeRooms.branchDeviceType(device.branchId, device.type),
    ]);
    logger.log(`[Socket] Device ${device.id} connected (${socket.id})`);

    socket.on("disconnect", (reason) => {
      logger.log(`[Socket] Device ${device.id} disconnected: ${reason}`);
    });
  });
}
