import { asClass, type AwilixContainer } from "awilix";
import { LicenseController } from "./license.controller";
import { LicenseDiscountRepository } from "./repositories/license-discount.repository";
import { LicensePricingRepository } from "./repositories/license-pricing.repository";
import { LicenseRedemptionRepository } from "./repositories/license-redemption.repository";
import { LicenseRepository } from "./repositories/license.repository";
import { LicenseDiscountService } from "./services/license-discount.service";
import { LicensePricingService } from "./services/license-pricing.service";
import { LicenseRedemptionService } from "./services/license-redemption.service";
import { LicenseService } from "./services/license.service";

export class LicenseContainer {
  static register(container: AwilixContainer): void {
    container.register({
      licenseRepository: asClass(LicenseRepository).singleton(),
      licensePricingRepository: asClass(LicensePricingRepository).singleton(),
      licenseDiscountRepository: asClass(LicenseDiscountRepository).singleton(),
      licenseRedemptionRepository: asClass(LicenseRedemptionRepository).singleton(),
      licenseService: asClass(LicenseService).singleton(),
      licensePricingService: asClass(LicensePricingService).singleton(),
      licenseDiscountService: asClass(LicenseDiscountService).singleton(),
      licenseRedemptionService: asClass(LicenseRedemptionService).singleton(),
      licenseController: asClass(LicenseController).singleton(),
    });
  }
}
