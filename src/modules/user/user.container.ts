import type { AwilixContainer } from "awilix";
import { asValue, asClass } from "awilix";
import { users } from "./user.schema";
import { UserRepository } from "./user.repository";

export class UserContainer {
  static register(container: AwilixContainer): void {
    container.register({
      userSchema: asValue(users),
      userRepository: asClass(UserRepository).singleton(),
    });
  }
}
