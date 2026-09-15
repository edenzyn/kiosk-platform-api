import { asClass, type AwilixContainer } from "awilix";
import { MenuController } from "./menu.controller";
import { MenuRepository } from "./menu.repository";
import { MenuService } from "./menu.service";

export class MenuContainer {
  static register(container: AwilixContainer): void {
    container.register({
      menuRepository: asClass(MenuRepository).singleton(),
      menuService: asClass(MenuService).singleton(),
      menuController: asClass(MenuController).singleton(),
    });
  }
}
