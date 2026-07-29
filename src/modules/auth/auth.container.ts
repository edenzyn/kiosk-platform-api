import type { AwilixContainer } from "awilix";
import { asClass } from "awilix";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

export class AuthContainer {
  static register(container: AwilixContainer): void {
    container.register({
      authService: asClass(AuthService).singleton(),
      authController: asClass(AuthController).singleton(),
    });
  }
}
