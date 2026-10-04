import type { SocketConnection } from "../../../config/socket";
import type { DeviceTypeEnum } from "../../enums/device/device-type.enum";
import type { SocketEventEnum } from "../../enums/socket/socket-event.enum";
import { DEVICE_SOCKET_NAMESPACE, RealtimeRooms } from "./realtime.constants";
import type { DeviceSocket } from "./realtime.types";

export class RealtimeProvider {
  constructor(private readonly socket: SocketConnection) {}

  emitToDevice(
    deviceId: string | null,
    event: SocketEventEnum,
    payload: unknown,
  ): void {
    if (!deviceId) return;

    this.socket.server
      .of(DEVICE_SOCKET_NAMESPACE)
      .to(RealtimeRooms.device(deviceId))
      .emit(event, payload);
  }

  /** Every device in the branch, or only those of one device type. */
  emitToBranch(
    branchId: string,
    event: SocketEventEnum,
    payload: unknown,
    deviceType?: DeviceTypeEnum,
  ): void {
    const room =
      deviceType === undefined
        ? RealtimeRooms.branch(branchId)
        : RealtimeRooms.branchDeviceType(branchId, deviceType);

    this.socket.server
      .of(DEVICE_SOCKET_NAMESPACE)
      .to(room)
      .emit(event, payload);
  }

  async getOnlineDeviceIds(): Promise<Set<string>> {
    const sockets = (await this.socket.server
      .of(DEVICE_SOCKET_NAMESPACE)
      .fetchSockets()) as unknown as DeviceSocket[];

    return new Set(sockets.map((socket) => socket.data.device.id));
  }

  /** Closes a device's connections, e.g. after it is deactivated. */
  disconnectDevice(deviceId: string): void {
    this.socket.server
      .of(DEVICE_SOCKET_NAMESPACE)
      .in(RealtimeRooms.device(deviceId))
      .disconnectSockets(true);
  }
}
