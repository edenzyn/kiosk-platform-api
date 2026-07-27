import type { AwilixContainer } from "awilix";
import { asClass } from "awilix";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";

export class AuthContainer {
  static register(container: AwilixContainer): void {
    container.register({
      authRepository: asClass(AuthRepository).singleton(),
      authService: asClass(AuthService).singleton(),
      authController: asClass(AuthController).singleton(),
    });
  }
}
