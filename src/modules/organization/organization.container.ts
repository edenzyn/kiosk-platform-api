import { asClass, type AwilixContainer } from "awilix";
import { OrganizationRepository } from "./organization.repository";
import { OrganizationService } from "./organization.service";
import { OrganizationController } from "./organization.controller";

export class OrganizationContainer {
  static register(container: AwilixContainer): void {
    container.register({
      organizationRepository: asClass(OrganizationRepository).singleton(),
      organizationService: asClass(OrganizationService).singleton(),
      organizationController: asClass(OrganizationController).singleton(),
    });
  }
}
