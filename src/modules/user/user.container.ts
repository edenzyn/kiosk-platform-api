import type { AwilixContainer } from "awilix";
import { asValue, asClass } from "awilix";
import { users } from "./user.schema";
import { UserRepository } from "./user.repository";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";

export class UserContainer {
  static register(container: AwilixContainer): void {
    container.register({
      userSchema: asValue(users),
      userRepository: asClass(UserRepository).singleton(),
      userService: asClass(UserService).singleton(),
      userController: asClass(UserController).singleton(),
    });
  }
}
