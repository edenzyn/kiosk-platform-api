import type { AwilixContainer } from "awilix";
import { asClass } from "awilix";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./services/auth.service";
import { OtpService } from "./services/otp.service";
import { TwoFactorService } from "./services/two-factor.service";

export class AuthContainer {
  static register(container: AwilixContainer): void {
    container.register({
      authRepository: asClass(AuthRepository).singleton(),
      authService: asClass(AuthService).singleton(),
      otpService: asClass(OtpService).singleton(),
      twoFactorService: asClass(TwoFactorService).singleton(),
      authController: asClass(AuthController).singleton(),
    });
  }
}
