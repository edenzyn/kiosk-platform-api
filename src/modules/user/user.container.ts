import type { AwilixContainer } from "awilix";
import { asClass } from "awilix";
import { UserController } from "./user.controller";
import { UserRepository } from "./user.repository";
import { UserService } from "./user.service";

export class UserContainer {
  static register(container: AwilixContainer): void {
    container.register({
      userRepository: asClass(UserRepository).singleton(),
      userService: asClass(UserService).singleton(),
      userController: asClass(UserController).singleton(),
    });
  }
}
