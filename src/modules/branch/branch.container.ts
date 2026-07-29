import { asClass } from "awilix";
import { BranchRepository } from "./branch.repository";
import { BranchService } from "./branch.service";
import { BranchController } from "./branch.controller";
import type { AwilixContainer } from "awilix";

export class BranchContainer {
  static register(container: AwilixContainer): void {
    container.register({
      branchRepository: asClass(BranchRepository).singleton(),
      branchService: asClass(BranchService).singleton(),
      branchController: asClass(BranchController).singleton(),
    });
  }
}
