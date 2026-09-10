import { asClass, type AwilixContainer } from "awilix";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { TaxRepository } from "./repositories/tax.repository";

export class FinanceContainer {
  static register(container: AwilixContainer): void {
    container.register({
      financeService: asClass(FinanceService).singleton(),
      taxRepository: asClass(TaxRepository).singleton(),
      financeController: asClass(FinanceController).singleton(),
    });
  }
}
