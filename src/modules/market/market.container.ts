import { asClass, type AwilixContainer } from "awilix";
import { MarketController } from "./market.controller";
import { MarketRepository } from "./market.repository";
import { MarketService } from "./market.service";

export class MarketContainer {
  static register(container: AwilixContainer): void {
    container.register({
      marketRepository: asClass(MarketRepository).singleton(),
      marketService: asClass(MarketService).singleton(),
      marketController: asClass(MarketController).singleton(),
    });
  }
}
