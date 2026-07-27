import { asFunction, createContainer, InjectionMode } from "awilix";
import { initDatabase } from "./db";
import { AuthContainer } from "../modules/auth/auth.container";
import { UserContainer } from "../modules/user/user.container";

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
  strict: true,
});

container.register({
  database: asFunction(initDatabase).singleton(),
});

UserContainer.register(container);
AuthContainer.register(container);
