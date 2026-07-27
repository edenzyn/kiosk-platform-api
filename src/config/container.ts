import { asFunction, createContainer, InjectionMode } from "awilix";
import { initDatabase } from "./db";
import { AuthContainer } from "../modules/auth/auth.container";

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
  strict: true,
});

container.register({
  database: asFunction(initDatabase).singleton(),
});

AuthContainer.register(container);
