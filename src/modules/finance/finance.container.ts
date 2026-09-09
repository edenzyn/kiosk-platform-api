import { asClass, type AwilixContainer } from "awilix";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { FinanceRepository } from "./repositories/finance.repository";
import { TaxRepository } from "./repositories/tax.repository";

export class FinanceContainer {
  static register(container: AwilixContainer): void {
    container.register({
      financeRepository: asClass(FinanceRepository).singleton(),
      financeService: asClass(FinanceService).singleton(),
      taxRepository: asClass(TaxRepository).singleton(),
      financeController: asClass(FinanceController).singleton(),
    });
  }
}
