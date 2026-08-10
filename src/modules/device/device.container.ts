import { asClass, type AwilixContainer } from "awilix";
import { DeviceController } from "./device.controller";
import { DeviceRepository } from "./device.repository";
import { DeviceService } from "./device.service";

export class DeviceContainer {
  static register(container: AwilixContainer): void {
    container.register({
      deviceRepository: asClass(DeviceRepository).singleton(),
      deviceService: asClass(DeviceService).singleton(),
      deviceController: asClass(DeviceController).singleton(),
    });
  }
}
