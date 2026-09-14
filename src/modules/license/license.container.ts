import { asClass, type AwilixContainer } from "awilix";
import { LicenseController } from "./license.controller";
import { LicenseDiscountRepository } from "./repositories/license-discount.repository";
import { LicensePlanRepository } from "./repositories/license-plan.repository";
import { LicenseRedemptionRepository } from "./repositories/license-redemption.repository";
import { LicenseTransactionRepository } from "./repositories/license-transaction.repository";
import { LicenseRepository } from "./repositories/license.repository";
import { LicenseDiscountService } from "./services/license-discount.service";
import { LicensePlanService } from "./services/license-plan.service";
import { LicenseRedemptionService } from "./services/license-redemption.service";
import { LicenseTransactionService } from "./services/license-transaction.service";
import { LicenseService } from "./services/license.service";

export class LicenseContainer {
  static register(container: AwilixContainer): void {
    container.register({
      licenseRepository: asClass(LicenseRepository).singleton(),
      licenseTransactionRepository: asClass(LicenseTransactionRepository).singleton(),
      licensePlanRepository: asClass(LicensePlanRepository).singleton(),
      licenseDiscountRepository: asClass(LicenseDiscountRepository).singleton(),
      licenseRedemptionRepository: asClass(LicenseRedemptionRepository).singleton(),
      licenseService: asClass(LicenseService).singleton(),
      licenseTransactionService: asClass(LicenseTransactionService).singleton(),
      licensePlanService: asClass(LicensePlanService).singleton(),
      licenseDiscountService: asClass(LicenseDiscountService).singleton(),
      licenseRedemptionService: asClass(LicenseRedemptionService).singleton(),
      licenseController: asClass(LicenseController).singleton(),
    });
  }
}
