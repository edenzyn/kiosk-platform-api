import type { AwilixContainer } from "awilix";
import { asValue } from "awilix";
import { users } from "./user.schema";

export class UserContainer {
  static register(container: AwilixContainer): void {
    container.register({
      userSchema: asValue(users),
    });
  }
}
