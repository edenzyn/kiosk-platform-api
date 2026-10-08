import { asClass, type AwilixContainer } from "awilix";
import { ShiftController } from "./shift.controller";
import { ShiftRepository } from "./shift.repository";
import { ShiftService } from "./shift.service";

export class ShiftContainer {
  static register(container: AwilixContainer): void {
    container.register({
      shiftRepository: asClass(ShiftRepository).singleton(),
      shiftService: asClass(ShiftService).singleton(),
      shiftController: asClass(ShiftController).singleton(),
    });
  }
}
