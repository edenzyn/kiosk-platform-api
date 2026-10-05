import { asClass, type AwilixContainer } from "awilix";
import { BusinessDayController } from "./business-day.controller";
import { BusinessDayRepository } from "./business-day.repository";
import { BusinessDayService } from "./business-day.service";

export class BusinessDayContainer {
  static register(container: AwilixContainer): void {
    container.register({
      businessDayRepository: asClass(BusinessDayRepository).singleton(),
      businessDayService: asClass(BusinessDayService).singleton(),
      businessDayController: asClass(BusinessDayController).singleton(),
    });
  }
}
