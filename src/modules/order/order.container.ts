import { asClass, type AwilixContainer } from "awilix";
import { OrderPaymentService } from "./services/order-payment.service";
import { OrderController } from "./order.controller";
import { OrderRepository } from "./order.repository";
import { OrderService } from "./services/order.service";

export class OrderContainer {
  static register(container: AwilixContainer): void {
    container.register({
      orderRepository: asClass(OrderRepository).singleton(),
      orderService: asClass(OrderService).singleton(),
      orderPaymentService: asClass(OrderPaymentService).singleton(),
      orderController: asClass(OrderController).singleton(),
    });
  }
}
