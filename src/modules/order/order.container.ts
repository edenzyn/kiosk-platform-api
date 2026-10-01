import { asClass, type AwilixContainer } from "awilix";
import { OrderController } from "./order.controller";
import { OrderRepository } from "./order.repository";
import { OrderService } from "./order.service";

export class OrderContainer {
  static register(container: AwilixContainer): void {
    container.register({
      orderRepository: asClass(OrderRepository).singleton(),
      orderService: asClass(OrderService).singleton(),
      orderController: asClass(OrderController).singleton(),
    });
  }
}
