import { asClass, type AwilixContainer } from "awilix";
import { PaymentProviderController } from "./controllers/payment-provider.controller";
import { TaxController } from "./controllers/tax.controller";
import { PaymentProviderRepository } from "./repositories/payment-provider.repository";
import { TaxRepository } from "./repositories/tax.repository";
import { PaymentProviderService } from "./services/payment-provider.service";
import { TaxService } from "./services/tax.service";

export class FinanceContainer {
  static register(container: AwilixContainer): void {
    container.register({
      taxRepository: asClass(TaxRepository).singleton(),
      taxService: asClass(TaxService).singleton(),
      taxController: asClass(TaxController).singleton(),
      paymentProviderRepository: asClass(PaymentProviderRepository).singleton(),
      paymentProviderService: asClass(PaymentProviderService).singleton(),
      paymentProviderController: asClass(PaymentProviderController).singleton(),
    });
  }
}
