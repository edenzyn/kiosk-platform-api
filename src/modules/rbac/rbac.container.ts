import type { AwilixContainer } from "awilix";
import { asClass } from "awilix";
import { RbacRepository } from "./rbac.repository";
import { RbacService } from "./rbac.service";
import { RbacController } from "./rbac.controller";

export class RbacContainer {
  static register(container: AwilixContainer): void {
    container.register({
      rbacRepository: asClass(RbacRepository).singleton(),
      rbacService: asClass(RbacService).singleton(),
      rbacController: asClass(RbacController).singleton(),
    });
  }
}
