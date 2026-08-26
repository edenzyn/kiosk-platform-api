import { asClass, type AwilixContainer } from "awilix";
import { FinanceController } from "./finance.controller";
import { FinanceRepository } from "./finance.repository";
import { FinanceService } from "./finance.service";

export class FinanceContainer {
  static register(container: AwilixContainer): void {
    container.register({
      financeRepository: asClass(FinanceRepository).singleton(),
      financeService: asClass(FinanceService).singleton(),
      financeController: asClass(FinanceController).singleton(),
    });
  }
}
