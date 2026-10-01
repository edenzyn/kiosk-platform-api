import { asClass, type AwilixContainer } from "awilix";
import { PaymentController } from "./controllers/payment.controller";
import { TaxController } from "./controllers/tax.controller";
import { PaymentRepository } from "./repositories/payment.repository";
import { TaxRepository } from "./repositories/tax.repository";
import { PaymentService } from "./services/payment.service";
import { TaxService } from "./services/tax.service";

export class FinanceContainer {
  static register(container: AwilixContainer): void {
    container.register({
      taxRepository: asClass(TaxRepository).singleton(),
      taxService: asClass(TaxService).singleton(),
      taxController: asClass(TaxController).singleton(),
      paymentRepository: asClass(PaymentRepository).singleton(),
      paymentService: asClass(PaymentService).singleton(),
      paymentController: asClass(PaymentController).singleton(),
    });
  }
}
