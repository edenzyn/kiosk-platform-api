import type { DefaultEventsMap, Socket } from "socket.io";
import type { DeviceTokenDto } from "../../dtos/device-token.dto";

export interface DeviceSocketData {
  device: DeviceTokenDto;
}

export type DeviceSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  DeviceSocketData
>;
