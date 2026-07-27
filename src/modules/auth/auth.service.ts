import type { AuthRepository } from "./auth.repository";
import type { AuthModuleStatus } from "./auth.types";

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  getStatus(): AuthModuleStatus {
    void this.authRepository;
  
    return {
      module: "auth",
      status: "available",
    };
  }
}
