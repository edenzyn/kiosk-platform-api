import type { AwilixContainer } from "awilix";
import { asClass } from "awilix";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./services/auth.service";
import { OneTimeTokenService } from "./services/one-time-token.service";
import { TwoFactorService } from "./services/two-factor.service";

export class AuthContainer {
  static register(container: AwilixContainer): void {
    container.register({
      authRepository: asClass(AuthRepository).singleton(),
      authService: asClass(AuthService).singleton(),
      oneTimeTokenService: asClass(OneTimeTokenService).singleton(),
      twoFactorService: asClass(TwoFactorService).singleton(),
      authController: asClass(AuthController).singleton(),
    });
  }
}
