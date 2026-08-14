import { asClass, type AwilixContainer } from "awilix";
import { PlatformController } from "./platform.controller";
import { PlatformService } from "./platform.service";

export class PlatformContainer {
  static register(container: AwilixContainer): void {
    container.register({
      platformService: asClass(PlatformService).singleton(),
      platformController: asClass(PlatformController).singleton(),
    });
  }
}
