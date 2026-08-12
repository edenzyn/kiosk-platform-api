import { asClass, type AwilixContainer } from "awilix";
import { LicenseController } from "./license.controller";
import { LicenseRepository } from "./license.repository";
import { LicenseService } from "./license.service";

export class LicenseContainer {
  static register(container: AwilixContainer): void {
    container.register({
      licenseRepository: asClass(LicenseRepository).singleton(),
      licenseService: asClass(LicenseService).singleton(),
      licenseController: asClass(LicenseController).singleton(),
    });
  }
}
