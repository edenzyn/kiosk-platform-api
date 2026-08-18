import { asClass, type AwilixContainer } from "awilix";
import { ResellerController } from "./reseller.controller";
import { ResellerService } from "./reseller.service";

export class ResellerContainer {
  static register(container: AwilixContainer): void {
    container.register({
      resellerService: asClass(ResellerService).singleton(),
      resellerController: asClass(ResellerController).singleton(),
    });
  }
}
